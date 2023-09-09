import { extendType, objectType, stringArg } from "nexus";
import { User } from "../entities/User";
import { Context } from "src/types/Context";

export const UserType = objectType({
  name: "User",
  definition(t) {
    t.nonNull.string("id"),
      t.nonNull.string("username"),
      t.nonNull.string("password"),
      t.nonNull.string("email");
    t.nonNull.string("refreshToken");
    t.nonNull.boolean("isVerified");
  },
});

export const UpdateUser = extendType({
  type: "Mutation",
  definition(t) {
    t.nonNull.field("user", {
      type: "User",
      args: {
        email: stringArg(),
        username: stringArg(),
      },
      async resolve(_parent, args, context: Context, _info) {
        const { email, username } = args;
        const { userId } = context;

        if (!userId) throw new Error("Login to access this resource");
        const user = await User.findOne({ where: { id: userId } });
        if (!user) throw new Error("User not found");
        if (!email && !username)
          throw new Error("You need to provided either email or username");
        if (email) {
          const existingEmail = await User.findOne({ where: { email } });
          if (existingEmail) throw new Error("Email already taken");
          user.email = email;
        }
        if (username) {
          const existingUsername = await User.findOne({ where: { username } });
          if (existingUsername) throw new Error("Username already taken");
          user.username = username;
        }
        await user.save();
        return user;
      },
    });
  },
});

export const getMe = extendType({
  type: "Query",
  definition(t) {
    t.nonNull.field("me", {
      type: "User",
      async resolve(_parent, _args, context: Context, _info) {
        const { userId } = context;
        if (!userId) throw new Error("Login to access this resource");
        const user = await User.findOne({ where: { id: userId } });
        if (!user) throw new Error("User not found");
        return user;
      },
    });
  },
});
