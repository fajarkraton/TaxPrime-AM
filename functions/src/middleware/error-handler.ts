import { type Request, type Response, type NextFunction } from 'express';
import { logger } from 'firebase-functions/v2';

export class AppError extends Error {
    constructor(public code: string, message: string, public httpStatus = 400, public details?: any) {
        super(message);
        this.name = 'AppError';
    }
}

export function handleError(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
    if (error instanceof AppError) {
        logger.warn(`[${error.code}] ${error.message}`, error.details);
        res.status(error.httpStatus).json({
            success: false,
            error: { code: error.code, message: error.message },
        });
        return;
    }

    // Error tidak terduga — jangan ekspos detail
    logger.error('Unexpected error:', error);
    res.status(500).json({
        success: false,
        error: { code: 'INT_001', message: 'Terjadi kesalahan internal' },
    });
}
