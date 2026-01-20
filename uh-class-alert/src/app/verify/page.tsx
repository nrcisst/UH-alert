'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (token) {
            // The actual verification happens server-side via /api/auth/verify
            // This page just shows a loading state while redirecting
            window.location.href = `/api/auth/verify?token=${token}`;
        } else {
            router.push('/?error=missing_token');
        }
    }, [token, router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="card text-center">
                <div className="w-8 h-8 border-2 border-[var(--uh-red)] border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                <h1 className="text-xl font-semibold mb-2">Verifying your login...</h1>
                <p className="text-[var(--foreground-muted)]">
                    Please wait while we sign you in.
                </p>
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="card text-center">
                    <div className="w-8 h-8 border-2 border-[var(--uh-red)] border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                    <h1 className="text-xl font-semibold mb-2">Loading...</h1>
                </div>
            </div>
        }>
            <VerifyContent />
        </Suspense>
    );
}
