import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { Session } from "next-auth";

type HandlerContext = {
    session: Session;
    userId: string;
    params?: Record<string, string>;
};

type HandlerFn = (
    req: Request,
    ctx: HandlerContext
) => Promise<NextResponse | Response>;

interface ApiHandlerOptions {
    /** If false, skip auth check (default: true) */
    requireAuth?: boolean;
}

/**
 * Wraps an API route handler with:
 * - Authentication check (session required by default)
 * - try-catch with structured error logging
 * - Consistent 401/500 response format
 *
 * Usage:
 * ```ts
 * export const GET = apiHandler(async (req, { session, userId }) => {
 *   const data = await prisma.order.findMany({ where: { userId } });
 *   return NextResponse.json(data);
 * });
 * ```
 */
export function apiHandler(fn: HandlerFn, options?: ApiHandlerOptions) {
    const { requireAuth = true } = options ?? {};

    return async (req: Request, routeCtx?: { params?: Promise<Record<string, string>> }) => {
        try {
            let session: Session | null = null;

            if (requireAuth) {
                session = await auth();
                if (!session?.user) {
                    return NextResponse.json(
                        { error: "Unauthorized" },
                        { status: 401 }
                    );
                }
            }

            const resolvedParams = routeCtx?.params ? await routeCtx.params : undefined;

            const ctx: HandlerContext = {
                session: session as Session,
                userId: (session?.user as { id?: string })?.id ?? "",
                params: resolvedParams,
            };

            return await fn(req, ctx);
        } catch (err) {
            const url = new URL(req.url);
            logger.error(
                "API",
                `${req.method} ${url.pathname} failed`,
                err
            );

            if (err instanceof ApiError) {
                return NextResponse.json(
                    { error: err.message },
                    { status: err.status }
                );
            }

            return NextResponse.json(
                { error: "Internal server error" },
                { status: 500 }
            );
        }
    };
}

/**
 * Custom error class for API routes — throw to return specific HTTP status.
 *
 * Usage:
 * ```ts
 * throw new ApiError(404, "Order not found");
 * throw new ApiError(403, "Insufficient permissions");
 * ```
 */
export class ApiError extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message);
        this.name = "ApiError";
    }
}
