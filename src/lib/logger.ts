/**
 * Structured logger — lightweight console wrapper with context tags.
 * Prepares structured format for future Sentry/external integration.
 */
export const logger = {
    info(context: string, msg: string, data?: unknown) {
        console.log(`[${context}] ${msg}`, data !== undefined ? data : "");
    },

    warn(context: string, msg: string, data?: unknown) {
        console.warn(`[${context}] ${msg}`, data !== undefined ? data : "");
    },

    error(context: string, msg: string, err?: unknown) {
        const errorDetail =
            err instanceof Error ? { message: err.message, stack: err.stack } : err;
        console.error(`[${context}] ${msg}`, errorDetail ?? "");
    },
};
