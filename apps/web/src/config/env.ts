import { z } from 'zod';

const envSchema = z.object({
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(16),
  INTERNAL_TOKEN: z.string().min(32),
  APP_PUBLIC_URL: z.string().url(),
  CF_ACCESS_CLIENT_ID: z.string().optional(),
  CF_ACCESS_CLIENT_SECRET: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(32),
});

export const getEnv = () => {
  return envSchema.parse(process.env);
};
