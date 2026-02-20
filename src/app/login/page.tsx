'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithGoogle } from '@/lib/firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('redirect') || '/dashboard';

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async () => {
        try {
            setIsLoading(true);
            setError(null);

            const user = await signInWithGoogle();

            // Verifikasi domain jika NEXT_PUBLIC_WORKSPACE_DOMAIN di-set
            const allowedDomain = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN;
            if (allowedDomain && !user.email?.endsWith(`@${allowedDomain}`)) {
                throw new Error(`Hanya email @${allowedDomain} yang diizinkan untuk login.`);
            }

            // Cookie diset otomatis oleh onAuthChange di AuthProvider via fetch('/api/login')

            // Redirect ke halaman yang dituju
            router.push(next);
            router.refresh(); // Force refresh middleware

        } catch (err: unknown) {
            console.error('Login failed:', err);
            // Firebase auth error code handling
            if (err instanceof Error) {
                const firebaseErr = err as Error & { code?: string };
                if (firebaseErr.code === 'auth/popup-closed-by-user') {
                    setError('Login dibatalkan.');
                } else {
                    setError(err.message || 'Terjadi kesalahan saat mencoba login.');
                }
            } else {
                setError('Terjadi kesalahan yang tidak diketahui.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
            <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
                <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">TaxPrime AM</CardTitle>
                    <CardDescription>
                        Silahkan masuk menggunakan akun TaxPrime Anda.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Gagal Login</AlertTitle>
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button
                        className="w-full h-12 text-md font-medium"
                        onClick={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Login with Google Workspace'
                        )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground mt-4">
                        Akses terbatas hanya untuk jaringan internal Putranto Technology dan TaxPrime.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
