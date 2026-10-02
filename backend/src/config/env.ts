import { z } from 'zod';

const mockMode = process.env.META_MOCK_MODE === 'true';

const envSchema = z.object({
  META_VERIFY_TOKEN: z.string().min(1),
  META_APP_SECRET: z.string().min(1),
  META_PAGE_ACCESS_TOKEN: mockMode
    ? z.string().optional().default('mock-token')
    : z.string().min(1),
  META_MOCK_MODE: z.enum(['true', 'false']).optional().default('false'),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
