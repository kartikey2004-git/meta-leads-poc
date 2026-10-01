import { z } from 'zod';

const envSchema = z.object({
  META_VERIFY_TOKEN: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_PAGE_ACCESS_TOKEN: z.string().min(1),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
