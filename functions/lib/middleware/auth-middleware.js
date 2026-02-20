"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const admin = __importStar(require("firebase-admin"));
const v2_1 = require("firebase-functions/v2");
function requireAuth(...allowedRoles) {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                res.status(401).json({
                    success: false,
                    error: { code: 'AUTH_001', message: 'Token tidak ditemukan' },
                });
                return;
            }
            const token = authHeader.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(token);
            if (!decodedToken.email?.endsWith('@taxprime.net')) {
                res.status(403).json({
                    success: false,
                    error: { code: 'AUTH_003', message: 'Domain email tidak diizinkan' },
                });
                return;
            }
            const userRole = decodedToken.role;
            if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
                v2_1.logger.warn(`Akses ditolak: ${decodedToken.email} (role: ${userRole}) mencoba akses endpoint restricted`);
                res.status(403).json({
                    success: false,
                    error: { code: 'AUTHZ_001', message: 'Akses tidak diizinkan untuk role ini' },
                });
                return;
            }
            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: userRole,
                department: decodedToken.department,
            };
            next();
        }
        catch (error) {
            v2_1.logger.error('Auth verification gagal:', error);
            res.status(401).json({
                success: false,
                error: { code: 'AUTH_002', message: 'Token expired atau tidak valid' },
            });
        }
    };
}
//# sourceMappingURL=auth-middleware.js.map