import * as crypto from "crypto";

export const getPasswordResetToken = async () => {
  const resetToken = crypto.randomBytes(20).toString("hex");
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  const otpExpireTimestamp = Date.now() + 15 * 60 * 1000;
  const currentDateAndTime = new Date(otpExpireTimestamp);
  const resetPasswordTokenExpire = currentDateAndTime;
  return {
    resetPasswordToken: resetPasswordToken,
    resetPasswordTokenExpire: resetPasswordTokenExpire,
    resetToken: resetToken,
  };
};
