import jwt from "jsonwebtoken";

export interface AuthTokenPayload {
  userId: string;
}

export const auth = (header: string): AuthTokenPayload => {
  const token = header.split(" ")[1];
  if (!token) throw new Error("Invalid token");

  try {
    const payload = jwt.verify(
      token,
      process.env.access_token_secret as jwt.Secret
    );
    if (typeof payload === "object" && "userId" in payload) {
      return payload as AuthTokenPayload;
    } else {
      throw new Error("Invalid token payload");
    }
  } catch (error) {
    throw new Error("Invalid token: " + error.message);
  }
};
