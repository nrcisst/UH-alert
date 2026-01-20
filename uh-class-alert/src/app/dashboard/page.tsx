'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Subscription {
    id: string;
    subject: string;
    catalogNbr: string;
    title: string | null;
    isOpen: boolean;
    seatsAvailable: number;
    lastChecked: string | null;
}

export default function Dashboard() {
    const router = useRouter();
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [addingClass, setAddingClass] = useState(false);
    const [subject, setSubject] = useState('');
    const [catalogNbr, setCatalogNbr] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchSubscriptions = async () => {
        try {
            const res = await fetch('/api/subscriptions');
            if (res.status === 401) {
                router.push('/');
                return;
            }
            const data = await res.json();
            setSubscriptions(data.subscriptions || []);
        } catch (err) {
            console.error('Failed to fetch subscriptions:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const handleAddClass = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setAddingClass(true);

        try {
            // First, verify the class exists
            const searchRes = await fetch(
                `/api/classes/search?subject=${subject.toUpperCase()}&catalogNbr=${catalogNbr}`
            );
            const searchData = await searchRes.json();

            if (!searchData.found) {
                setError('Class not found. Please check the subject and catalog number.');
                setAddingClass(false);
                return;
            }

            // Add subscription
            const res = await fetch('/api/subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: subject.toUpperCase(),
                    catalogNbr,
                    title: searchData.class.title,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(`Added ${subject.toUpperCase()} ${catalogNbr} to your watchlist!`);
                setSubject('');
                setCatalogNbr('');
                fetchSubscriptions();
            } else {
                setError(data.error || 'Failed to add class');
            }
        } catch {
            setError('Failed to add class');
        } finally {
            setAddingClass(false);
        }
    };

    const handleRemoveClass = async (id: string) => {
        try {
            const res = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSubscriptions(prev => prev.filter(s => s.id !== id));
            }
        } catch (err) {
            console.error('Failed to remove class:', err);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-[var(--foreground-muted)]">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="border-b border-[var(--border)] p-4">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-xl">UH Class Alert</span>
                    </div>
                    <button onClick={handleLogout} className="btn-secondary text-sm">
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-8">Your Watchlist</h1>

                {/* Add Class Form */}
                <div className="card mb-8">
                    <h2 className="text-xl font-semibold mb-4">Add a Class</h2>
                    <form onSubmit={handleAddClass} className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Subject (e.g., COSC)"
                            className="input sm:w-32"
                            maxLength={4}
                            required
                        />
                        <input
                            type="text"
                            value={catalogNbr}
                            onChange={(e) => setCatalogNbr(e.target.value)}
                            placeholder="Class # (e.g., 4337)"
                            className="input sm:w-40"
                            maxLength={5}
                            required
                        />
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={addingClass}
                        >
                            {addingClass ? 'Adding...' : 'Add Class'}
                        </button>
                    </form>
                    {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
                    {success && <p className="mt-3 text-green-400 text-sm">{success}</p>}
                </div>

                {/* Subscriptions List */}
                {subscriptions.length === 0 ? (
                    <div className="card text-center py-12">
                        <p className="text-[var(--foreground-muted)]">
                            No classes on your watchlist yet. Add one above!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {subscriptions.map((sub) => (
                            <div key={sub.id} className="card flex items-center justify-between animate-fade-in">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-3 h-3 rounded-full ${sub.isOpen ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <div>
                                            <h3 className="font-semibold text-lg">
                                                {sub.subject} {sub.catalogNbr}
                                            </h3>
                                            {sub.title && (
                                                <p className="text-[var(--foreground-muted)] text-sm">{sub.title}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-sm text-[var(--foreground-muted)]">
                                        {sub.isOpen ? (
                                            <span className="status-open font-medium">
                                                {sub.seatsAvailable} seat{sub.seatsAvailable !== 1 ? 's' : ''} available!
                                            </span>
                                        ) : (
                                            <span>Currently closed</span>
                                        )}
                                        {sub.lastChecked && (
                                            <span className="ml-3">
                                                • Last checked: {new Date(sub.lastChecked).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemoveClass(sub.id)}
                                    className="text-[var(--foreground-muted)] hover:text-red-400 transition-colors p-2"
                                    title="Remove from watchlist"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 p-4 rounded-lg bg-[var(--background-tertiary)] text-sm text-[var(--foreground-muted)]">
                    <p>
                        We check for class openings every 2 hours. When a seat opens up,
                        you&apos;ll receive an email notification immediately.
                    </p>
                </div>
            </main>
        </div>
    );
}
