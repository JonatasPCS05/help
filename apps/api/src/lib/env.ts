import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET é obrigatório"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  STONE_API_URL: z.string().optional(),
  STONE_CLIENT_ID: z.string().optional(),
  STONE_CLIENT_SECRET: z.string().optional(),
  STONE_WEBHOOK_SECRET: z.string().optional(),
  PLATAFORMA_TAXA_PERCENTUAL: z.coerce.number().default(2.0),
  FCM_PROJECT_ID: z.string().optional(),
  FCM_CLIENT_EMAIL: z.string().optional(),
  FCM_PRIVATE_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("no-reply@help.app"),
  WHATSAPP_API_URL: z.string().optional(),
  WHATSAPP_API_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
});

export const env = envSchema.parse(process.env);
