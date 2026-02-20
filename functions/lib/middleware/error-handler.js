"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.handleError = handleError;
const v2_1 = require("firebase-functions/v2");
class AppError extends Error {
    code;
    httpStatus;
    details;
    constructor(code, message, httpStatus = 400, details) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function handleError(error, _req, res, _next) {
    if (error instanceof AppError) {
        v2_1.logger.warn(`[${error.code}] ${error.message}`, error.details);
        res.status(error.httpStatus).json({
            success: false,
            error: { code: error.code, message: error.message },
        });
        return;
    }
    // Error tidak terduga — jangan ekspos detail
    v2_1.logger.error('Unexpected error:', error);
    res.status(500).json({
        success: false,
        error: { code: 'INT_001', message: 'Terjadi kesalahan internal' },
    });
}
//# sourceMappingURL=error-handler.js.map