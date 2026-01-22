'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function UnsubscribeContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const [unsubscribed, setUnsubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleUnsubscribe = async () => {
        if (!email) {
            setError('No email provided');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setUnsubscribed(true);
            } else {
                setError(data.error || 'Failed to unsubscribe');
            }
        } catch {
            setError('Failed to unsubscribe. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (unsubscribed) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="card text-center max-w-md">
                    <h1 className="text-2xl font-bold mb-4">Unsubscribed</h1>
                    <p className="text-[var(--foreground-muted)] mb-6">
                        You have been unsubscribed from all class alerts.
                    </p>
                    <Link href="/" className="btn-primary inline-block">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="card text-center max-w-md">
                <h1 className="text-2xl font-bold mb-4">Unsubscribe</h1>
                <p className="text-[var(--foreground-muted)] mb-6">
                    Are you sure you want to unsubscribe{email ? ` ${email}` : ''} from all class alert emails?
                </p>
                <div className="flex gap-4 justify-center">
                    <Link href="/" className="btn-secondary">
                        Cancel
                    </Link>
                    <button
                        onClick={handleUnsubscribe}
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Unsubscribing...' : 'Unsubscribe'}
                    </button>
                </div>
                {error && (
                    <p className="mt-4 text-red-400 text-sm">{error}</p>
                )}
            </div>
        </div>
    );
}

export default function UnsubscribePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-[var(--foreground-muted)]">Loading...</div>
            </div>
        }>
            <UnsubscribeContent />
        </Suspense>
    );
}
