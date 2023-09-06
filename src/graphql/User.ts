import {  objectType } from "nexus";

export const UserType = objectType({
  name: "User",
  definition(t) {
    t.nonNull.int("id"),
      t.nonNull.string("username"),
      t.nonNull.string("password"),
      t.nonNull.string("email");
  },
});

