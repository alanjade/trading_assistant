const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

interface ValidationResult {
  valid: boolean;
  missing: RequiredEnvVar[];
  errors: string[];
}

export function validateEnvironment(): ValidationResult {
  const missing: RequiredEnvVar[] = [];
  const errors: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    if (!value || value.trim() === '') {
      missing.push(envVar);
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    errors,
  };
}

export function getEnv<T extends string>(key: T): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
}

export function getOptionalEnv<T extends string>(key: T, fallback?: string): string {
  return process.env[key] ?? fallback ?? '';
}
