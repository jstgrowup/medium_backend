import { z } from "zod";

export const blogValidationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Title is required"),
  published: z.boolean(),
});
