/**
 * Environment Variable Validation
 * This module ensures that all required environment variables are present at boot time.
 * If any critical variables are missing, the application will fail fast.
 */

// Define required environment variables depending on the environment context.
const isServer = typeof window === "undefined";

const clientEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const serverEnvVars = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "RESEND_API_KEY",
  "OTP_PEPPER",
  "QR_SECRET",
];

export function validateEnv() {
  const missingVars: string[] = [];

  // Always validate client-side vars
  for (const key of clientEnvVars) {
    if (!process.env[key]) {
      missingVars.push(key);
    }
  }

  // Only validate server-side vars if running on the server
  if (isServer) {
    for (const key of serverEnvVars) {
      if (!process.env[key]) {
        missingVars.push(key);
      }
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `[Environment Validation Error] Missing required environment variables: ${missingVars.join(
        ", "
      )}`
    );
  }
}

// Automatically validate when this file is imported
validateEnv();

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  OTP_PEPPER: process.env.OTP_PEPPER,
  QR_SECRET: process.env.QR_SECRET,
};
