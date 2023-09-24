import * as otpGenerator from "otp-generator";

export const generateOTP = async () => {
  const OTP = await otpGenerator.generate(6, {
    upperCaseAlphabets: true,
    specialChars: false,
  });
  return OTP;
};
