import { z } from "zod";
export const userSignupValidationSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string(),
  name: z.string(),
});
export const userSigninValidationSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string(),
});
export const userProfilePicValidationSchema = z.object({
  imageUrl: z.string(),
});
