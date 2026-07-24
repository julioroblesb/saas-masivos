import { z } from 'zod';

const envSchema = z.object({
  EVOLUTION_API_URL: z.string().url().default('http://100.72.75.79:8080'),
  EVOLUTION_API_KEY: z.string().min(1).default('masivos_evolution_secret_key_2026'),
  INTERNAL_TOKEN: z.string().min(1).default('masivos_webhook_secret_2026'),
  CF_ACCESS_CLIENT_ID: z.string().optional(),
  CF_ACCESS_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

export const getEnv = () => {
  return envSchema.parse(process.env);
};
