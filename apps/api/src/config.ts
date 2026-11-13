import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4100),
  HOST: z.string().min(1).default("0.0.0.0"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),
  COOKIE_DOMAIN: z.string().optional().default(""),
  TRUST_PROXY: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true"),
  EVENT_RETENTION_DAYS: z.coerce.number().int().min(0).default(90),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
