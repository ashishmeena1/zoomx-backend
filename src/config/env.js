import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL:     z.string().url("DATABASE_URL must be a valid URL"),
  DIRECT_URL:       z.string().url("DIRECT_URL must be a valid URL").optional(),
  JWT_SECRET:       z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN:   z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().min(10, "GOOGLE_CLIENT_ID is required"),
  CLIENT_URL:       z.string().min(1, "CLIENT_URL is required"),
  PORT:             z.coerce.number().int().positive().default(8080),
  NODE_ENV:         z.enum(["development", "production", "test"]).default("development"),
  COOKIE_SECURE:    z.enum(["true", "false"]).default("false"),
  COOKIE_DOMAIN:    z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  console.error(`\n❌ Invalid environment variables:\n${issues}\n`);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  databaseUrl:    data.DATABASE_URL,
  jwtSecret:      data.JWT_SECRET,
  jwtExpiresIn:   data.JWT_EXPIRES_IN,
  googleClientId: data.GOOGLE_CLIENT_ID,
  port:           data.PORT,
  nodeEnv:        data.NODE_ENV,
  isProd:         data.NODE_ENV === "production",
  isDev:          data.NODE_ENV === "development",
  allowedOrigins: data.CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean),
  cookie: {
    secure:   data.COOKIE_SECURE === "true",
    domain:   data.COOKIE_DOMAIN || undefined,
    sameSite: data.COOKIE_SECURE === "true" ? "none" : "lax",
  },
};
