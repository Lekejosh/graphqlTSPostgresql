import { extendType, nonNull, objectType, stringArg } from "nexus";
import { Context } from "src/types/Context";
import argon2 from "argon2";
import { User } from "../entities/User";
import { Response } from "express";
import { accessToken, refreshToken } from "../utils/tokens";
import jwt from "jsonwebtoken"; // Use import statement instead of * as jwt

export const AuthType = objectType({
  name: "AuthType",
  definition(t) {
    t.nonNull.string("token");
    t.nonNull.field("user", {
      type: "User",
    });
  },
});

export const AuthMutation = extendType({
  type: "Mutation",
  definition(t) {
    t.nonNull.field("login", {
      type: "AuthType",
      args: {
        emailOrUsername: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      async resolve(_parent, args, context: Context, _info) {
        const { emailOrUsername, password } = args;
        const user = await User.findOne({
          where: [{ username: emailOrUsername }, { email: emailOrUsername }],
        });
        if (!user) {
          throw new Error("User not found");
        }

        const isValid = await argon2.verify(user.password, password);

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        const access_token = await accessToken(user.id);
        const refresh_token = await refreshToken(user.id);

        user.refreshToken = refresh_token;
       try {
         await user.save();
       } catch (error) {
         console.error("Error saving user:", error);
       }
        // Set refresh_token as a cookie in the response
        context.res.cookie("refreshToken", refresh_token, {
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
        });

        return { user, token: access_token };
      },
    });
    t.nonNull.field("register", {
      type: "AuthType",
      args: {
        username: nonNull(stringArg()),
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      async resolve(_parent, args, context: Context, _info) {
        const { username, email, password } = args;
        const hashedPassword = await argon2.hash(password);
        let user;
        let token;

        const existingUser = await User.findOne({
          where: [{ username: username }, { email: email }],
        });

        if (existingUser) {
          throw new Error("This username or this email is already taken");
        }

        try {
          const result = await context.conn
            .createQueryBuilder()
            .insert()
            .into(User)
            .values({
              username,
              email,
              password: hashedPassword,
              refreshToken: null,
            })
            .returning("*")
            .execute();

          user = result.raw[0];

          token = await accessToken(user.id);
          const refresh_token = await refreshToken(user.id);

          var userNew = await User.findOne({ where: { id: user.id } });
          userNew!.refreshToken = refresh_token;
          await userNew!.save();
          context.res.cookie("refreshToken", refresh_token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
          });
        } catch (err) {
          console.log(err);
        }

        return { user: userNew!, token };
      },
    });

   t.nonNull.field("refreshToken", {
     type: "AuthType",
     async resolve(_parent, _args, context: Context, _info) {

       if (!context.req.cookies.refreshToken) {
         throw new Error("No Refresh Token present, please login");
       }
       const refreshToken = context.req.cookies.refreshToken;
       context.res.clearCookie("refreshToken", {
         httpOnly: true,
         secure: true,
         sameSite: "none",
       });
       const user = await User.findOne({
         where: { refreshToken: refreshToken },
       });
       if (!user) {
         const decoded = jwt.verify(
           refreshToken,
           process.env.refresh_token_secret!,
           async (err: any, decoded: any) => {
             if (err) {
               throw new Error("Invalid Refresh Token");
             }
             const hackedUser = await User.findOne({
               where: { id: decoded?.userId },
             });

             if (hackedUser) {
               hackedUser?.refreshToken = "null";
               await hackedUser.save();
               throw new Error("Token compromised, login again");
             }
             // Ensure you return a non-null value in all cases
             return { token: ""};
           }
         );
       } else {
         const result = await new Promise((resolve, reject) => {
           jwt.verify(
             refreshToken,
             process.env.refresh_token_secret!,
             async (err: any, decoded: any) => {
               if (err || user.id !== decoded.userId) {
                 reject(new Error("Forbidden"));
               } else {
                 const accessToken = jwt.sign(
                   { userId: decoded?.userId },
                   process.env.access_token_secret!,
                   { expiresIn: process.env.access_token_expire }
                 );

                 const newRefreshToken = jwt.sign(
                   { userId: user!.id },
                   process.env.refresh_token_secret!,
                   { expiresIn: process.env.refresh_token_expire }
                 );
                 user.refreshToken = newRefreshToken;
                 await user.save();
                 context.res.cookie("refreshToken", newRefreshToken, {
                   httpOnly: true,
                   secure: true,
                   sameSite: false,
                   maxAge: 24 * 60 * 60 * 1000,
                 });
                 resolve({ token: accessToken });
               }
             }
           );
         });
         return result;
       }
       return { token: ""};
     },
   });

  },
});
