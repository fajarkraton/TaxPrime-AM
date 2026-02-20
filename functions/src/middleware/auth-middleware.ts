import { type Request, type Response, type NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
// Gunakan tipe string fallback karena tidak import full types
type UserRole = 'super_admin' | 'admin' | 'manager' | 'staff' | 'auditor';

export function requireAuth(...allowedRoles: UserRole[]) {
    return async (req: Request | any, res: Response, next: NextFunction) => {
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

            const userRole = decodedToken.role as UserRole;
            if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
                logger.warn(`Akses ditolak: ${decodedToken.email} (role: ${userRole}) mencoba akses endpoint restricted`);
                res.status(403).json({
                    success: false,
                    error: { code: 'AUTHZ_001', message: 'Akses tidak diizinkan untuk role ini' },
                });
                return;
            }

            req.user = {
                uid: decodedToken.uid,
                email: decodedToken.email!,
                role: userRole,
                department: decodedToken.department as string,
            };

            next();
        } catch (error) {
            logger.error('Auth verification gagal:', error);
            res.status(401).json({
                success: false,
                error: { code: 'AUTH_002', message: 'Token expired atau tidak valid' },
            });
        }
    };
}
