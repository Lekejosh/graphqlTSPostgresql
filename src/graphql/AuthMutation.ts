import { extendType, nonNull, stringArg } from "nexus";
import { Context } from "src/types/Context";
import argon2 from "argon2";
import { User } from "../entities/User";
import { accessToken, refreshToken } from "../utils/tokens";
import jwt from "jsonwebtoken";
import { generateOTP } from "../utils/otpGenerate";
import { sendEmail } from "../utils/mail";
import { getPasswordResetToken } from "../utils/passwordResetToken";
import * as crypto from "crypto";

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
          const otpExpireTimestamp = Date.now() + 15 * 60 * 1000;
          const currentDateAndTime = new Date(otpExpireTimestamp);

          const result = await context.conn
            .createQueryBuilder()
            .insert()
            .into(User)
            .values({
              username,
              email,
              password: hashedPassword,
              refreshToken: null,
              isVerified: false,
              otp: await generateOTP(),
              otpExpire: currentDateAndTime,
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
          const data = `Your email Verification Token is :-\n\n ${
            userNew!.otp
          } (This is only availbale for 15 Minutes!)\n\nif you have not requested this email  then, please Ignore it`;
          await sendEmail({
            email: `${userNew!.username} <${userNew!.email}>`,
            subject: "Veritfy Account",
            html: data,
          })
            .then(() => {
              console.log("Email Sent Successfully");
            })
            .catch((err: any) => {
              console.log(err);
              throw new Error("Error sending Email Verification");
            });
        } catch (err) {
          console.log(err);
        }

        return { user: userNew!, token };
      },
    });

    t.nonNull.field("accessToken", {
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
          await jwt.verify(
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
                hackedUser.refreshToken = "null";
                await hackedUser.save();
                throw new Error("Token compromised, login again");
              }
              return { token: "" };
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
        return { token: "" };
      },
    });
    t.nonNull.field("verifyEmail", {
      type: "AuthType",
      args: {
        otp: nonNull(stringArg()),
      },

      async resolve(_parent, args, context: Context, _info) {
        const { otp } = args;
        if (!context.userId) throw new Error("Login to access this resource");
        var user = await User.findOne({ where: { id: context.userId } });

        if (!user) {
          throw new Error("User not found");
        }
        let presentTime = await Date.now();
        const date = new Date(user.otpExpire!);
        const timestamp = date.getTime();

        if (otp !== user.otp || presentTime > timestamp) {
          throw new Error("Token invalid or has expired");
        }

        user.isVerified = true;
        user.otpExpire = null;
        user.otp = null;
        await user.save();

        await sendEmail({
          email: `${user!.username} <${user!.email}>`,
          subject: "Email Verified Successfully",
          html: "Account Verified Successfully",
        });

        return {
          user,
          message: "Email verified successfully",
        };
      },
    });

    t.nonNull.field("requestOtp", {
      type: "AuthType",
      async resolve(_parent, _args, context: Context, _info) {
        if (!context.userId) {
          throw new Error("Login to access this resource");
        }
        const user = await User.findOne({ where: { id: context.userId } });
        if (!user) {
          throw new Error("User not found");
        }

        if (user.isVerified) {
          throw new Error("Account already verified");
        }

        const newOtp = await generateOTP();
        const otpExpireTimestamp = Date.now() + 15 * 60 * 1000;
        const currentDateAndTime = new Date(otpExpireTimestamp);
        user.otp = newOtp;
        user.otpExpire = currentDateAndTime;
        await user.save();
        const data = `Your email Verification Token is :-\n\n ${
          user!.otp
        } (This is only available for 15 Minutes!)\n\nif you have not requested this email then, please Ignore it`;
        await sendEmail({
          email: `${user!.username} <${user!.email}>`,
          subject: "Verify Account",
          html: data,
        })
          .then(() => {
            console.log("Email Sent Successfully");
          })
          .catch((err: any) => {
            console.log(err);
            throw new Error("Error sending Email Verification");
          });
        return { user, message: "OTP sent to email" };
      },
    });
    t.nonNull.field("updatePassword", {
      type: "AuthType",
      args: {
        currentPassword: nonNull(stringArg()),
        newPassword: nonNull(stringArg()),
        confirmPassword: nonNull(stringArg()),
      },
      async resolve(_parent, args, context: Context, _info) {
        const { currentPassword, newPassword, confirmPassword } = args;

        if (!context.userId) {
          throw new Error("Login to access this resource");
        }

        const user = await User.findOne({ where: { id: context.userId } });

        if (!user) {
          throw new Error("User not found");
        }

        const isValid = await argon2.verify(user.password, currentPassword);
        if (!isValid) {
          throw new Error("Old Password not correct");
        }

        if (newPassword !== confirmPassword) {
          throw new Error("Password does not match");
        }
        const hashedPassword = await argon2.hash(newPassword);
        user.password = hashedPassword;
        await user.save();

        return { user, message: "Password updated, successfully" };
      },
    });
    t.nonNull.field("forgotPassword", {
      type: "AuthType",
      args: {
        usernameOrEmail: nonNull(stringArg()),
      },
      async resolve(_parent, args, context: Context, _info) {
        const { usernameOrEmail } = args;
        const { req } = context;
        const user = await User.findOne({
          where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
        });
        if (!user) {
          throw new Error("User not found");
        }
        const tokens = await getPasswordResetToken();

        user.resetPasswordToken = tokens.resetPasswordToken;
        user.resetPasswordTokenExpire = tokens.resetPasswordTokenExpire;
        await user.save();
        const resetPasswordUrl = `${req.protocol}://${req.get(
          "host"
        )}/graphql?token=${tokens.resetToken}`;
        const message = `Your password reset Token is :-\n\n ${resetPasswordUrl} \n\nif you have not requested this email then, please Ignore it`;
        try {
          await sendEmail({
            email: user.email,
            subject: `User Password Recovery`,
            html: message,
          });
        } catch (error) {
          user.resetPasswordToken = null;
          user.resetPasswordTokenExpire = null;

          await user.save();
          throw new Error("Error sending reset mail");
        }
        return { user, message: "Reset Password Mail send Succssfully" };
      },
    });
    t.nonNull.field("resetPassword", {
      type: "AuthType",
      args: {
        resetToken: nonNull(stringArg()),
        newPassword: nonNull(stringArg()),
        confirmPassword: nonNull(stringArg()),
      },
      async resolve(_parent, args, _context, _info) {
        const { resetToken, newPassword, confirmPassword } = args;
        const resetPasswordToken = crypto
          .createHash("sha256")
          .update(resetToken)
          .digest("hex");

        const user = await User.findOne({
          where: {
            resetPasswordToken: resetPasswordToken,
          },
        });

        if (!user) {
          throw new Error("Token invalid or has expired");
        }
        let presentTime = Date.now();
        const date = new Date(user.resetPasswordTokenExpire!);
        const timestamp = date.getTime();

        if (presentTime > timestamp) {
          throw new Error("Token invalid or has expired");
        }

        if (newPassword !== confirmPassword) {
          throw new Error("Password does not match");
        }

        const hashedPassword = await argon2.hash(newPassword);
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordTokenExpire = null;
        await user.save();

        return { user, message: "Password reset successfull" };
      },
    });
  },
});
