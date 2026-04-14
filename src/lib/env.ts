import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Runtime validation for environment variables.
 * Fails fast with clear error messages if required vars are missing.
 */
const envSchema = z.object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DIRECT_URL: z.string().optional(),
    AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
    NEXTAUTH_URL: z.string().url().optional(),
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
});

function validateEnv() {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        logger.error(
            "env",
            "Invalid environment variables",
            parsed.error,
            parsed.error.flatten().fieldErrors
        );
        throw new Error(
            `Missing or invalid environment variables: ${Object.keys(parsed.error.flatten().fieldErrors).join(", ")}`
        );
    }

    return parsed.data;
}

export const env = validateEnv();
