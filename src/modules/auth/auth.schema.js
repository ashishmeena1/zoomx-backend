import { z } from "zod";

export const googleAuthSchema = z.object({
  credential: z
    .string({ required_error: "Google credential is required" })
    .min(10, "Invalid credential"),
});
