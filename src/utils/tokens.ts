import * as jwt from "jsonwebtoken";
// import dotenv from 'dotenv'
// dotenv.config()

export const refreshToken = async (userId: string) => {
  return jwt.sign({ userId }, process.env.refresh_token_secret as jwt.Secret, {
    expiresIn: process.env.refresh_token_expire,
  });
};

export const accessToken = async (userId: string) => {
  return jwt.sign({ userId }, process.env.access_token_secret as jwt.Secret, {
    expiresIn: process.env.access_token_expire,
  });
};
