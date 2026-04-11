import { z } from "zod";

export const createRoomSchema = z.object({
  name: z
    .string({ required_error: "Room name is required" })
    .trim()
    .min(1, "Room name cannot be empty")
    .max(80, "Room name must be 80 characters or less"),
});

export const roomCodeSchema = z.object({
  code: z
    .string()
    .regex(/^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/, "Invalid room code format"),
});
