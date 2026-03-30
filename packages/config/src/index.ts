import { z } from "zod";

const commonSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

const apiSchema = commonSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  JWT_SECRET: z.string().min(16),
  ACTION_SIGNING_SECRET: z.string().min(16),
  BOOTSTRAP_KEY: z.string().min(8).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
});

const webSchema = commonSchema.extend({
  AUTH_SECRET: z.string().min(16),
  NEXTAUTH_SECRET: z.string().min(16).optional(),
  JWT_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
  SUPER_ADMIN_EMAILS: z.string().optional(),
}).superRefine((value, ctx) => {
  if ((value.GOOGLE_CLIENT_ID && !value.GOOGLE_CLIENT_SECRET) || (!value.GOOGLE_CLIENT_ID && value.GOOGLE_CLIENT_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["GOOGLE_CLIENT_SECRET"],
      message: "Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET together.",
    });
  }
  if ((value.GITHUB_CLIENT_ID && !value.GITHUB_CLIENT_SECRET) || (!value.GITHUB_CLIENT_ID && value.GITHUB_CLIENT_SECRET)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["GITHUB_CLIENT_SECRET"],
      message: "Set both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET together.",
    });
  }
});

export type ApiEnv = z.infer<typeof apiSchema>;
export type WebEnv = z.infer<typeof webSchema>;

export function getApiEnv(): ApiEnv {
  return apiSchema.parse(process.env);
}

export function getWebEnv(): WebEnv {
  return webSchema.parse(process.env);
}
