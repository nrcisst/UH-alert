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

interface CachedSection {
    classNbr: string;
    section: string;
    instructor: string;
    schedule: string;
    location: string;
    isOpen: boolean;
    seatsAvailable: number;
    enrollmentCap: number;
    enrollmentTotal: number;
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
    const [expandedClass, setExpandedClass] = useState<string | null>(null);
    const [sectionsCache, setSectionsCache] = useState<Record<string, CachedSection[]>>({});
    const [loadingSections, setLoadingSections] = useState(false);

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

    const handleToggleExpand = async (sub: Subscription) => {
        const classKey = `${sub.subject}-${sub.catalogNbr}`;

        if (expandedClass === classKey) {
            setExpandedClass(null);
            return;
        }

        setExpandedClass(classKey);

        // Use cached data if we already have it in memory
        if (sectionsCache[classKey]) {
            return;
        }

        setLoadingSections(true);
        try {
            // First try to get cached sections
            let res = await fetch(`/api/classes/cached-sections?subject=${sub.subject}&catalogNbr=${sub.catalogNbr}`);
            let data = await res.json();

            // If no sections in cache, fetch live data (which will automatically populate cache)
            if (!data.sections || data.sections.length === 0) {
                res = await fetch(`/api/classes/sections?subject=${sub.subject}&catalogNbr=${sub.catalogNbr}`);
                data = await res.json();
            }

            setSectionsCache(prev => ({ ...prev, [classKey]: data.sections || [] }));
        } catch (err) {
            console.error('Failed to fetch sections:', err);
        } finally {
            setLoadingSections(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-[var(--foreground-muted)]">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen hero-gradient">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--background)]/50">
                <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/University_of_Houston_Logo.svg.png" alt="UH" className="w-8 h-8" />
                        <span className="font-semibold text-lg tracking-tight">Alert</span>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--glass)] border border-transparent hover:border-[var(--glass-border)] transition-all duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign out
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-10">
                <div className="mb-10">
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Your Watchlist</h1>
                    <p className="text-[var(--foreground-muted)]">Add classes to track and get notified when seats open up.</p>
                </div>

                {/* Add Class Form */}
                <div className="card mb-8">
                    <h2 className="text-xl font-semibold mb-6">Add a Class</h2>
                    <form onSubmit={handleAddClass} className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm text-[var(--foreground-muted)] mb-2">Subject Code</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value.toUpperCase())}
                                    placeholder="COSC"
                                    className="input w-full uppercase"
                                    maxLength={4}
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm text-[var(--foreground-muted)] mb-2">Course Number</label>
                                <input
                                    type="text"
                                    value={catalogNbr}
                                    onChange={(e) => setCatalogNbr(e.target.value)}
                                    placeholder="4337"
                                    className="input w-full"
                                    maxLength={5}
                                    required
                                />
                            </div>
                            <div className="sm:self-end">
                                <button
                                    type="submit"
                                    className="btn-primary w-full sm:w-auto"
                                    disabled={addingClass}
                                >
                                    {addingClass ? 'Adding...' : 'Add to Watchlist'}
                                </button>
                            </div>
                        </div>
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
                        {subscriptions.map((sub, index) => {
                            const classKey = `${sub.subject}-${sub.catalogNbr}`;
                            const isExpanded = expandedClass === classKey;

                            return (
                                <div
                                    key={sub.id}
                                    className="card animate-fade-in overflow-hidden"
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <div
                                        className="flex items-center justify-between cursor-pointer group"
                                        onClick={() => handleToggleExpand(sub)}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-3 h-3 rounded-full ${sub.isOpen ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                                                <div>
                                                    <h3 className="font-semibold text-lg tracking-tight">
                                                        {sub.subject} {sub.catalogNbr}
                                                    </h3>
                                                    {sub.title && (
                                                        <p className="text-[var(--foreground-muted)] text-sm">{sub.title}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-3 ml-7 text-sm flex items-center gap-3">
                                                {sub.isOpen ? (
                                                    <span className="text-green-400 font-medium">
                                                        {sub.seatsAvailable} seat{sub.seatsAvailable !== 1 ? 's' : ''} available
                                                    </span>
                                                ) : (
                                                    <span className="text-[var(--foreground-muted)]">Currently closed</span>
                                                )}
                                                <span className="text-[var(--foreground-muted)] opacity-60">
                                                    Click to view all sections
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className={`text-[var(--foreground-muted)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                            >
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRemoveClass(sub.id); }}
                                                className="opacity-0 group-hover:opacity-100 text-[var(--foreground-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 p-2 rounded-lg"
                                                title="Remove from watchlist"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 6h18" />
                                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details - From Cache */}
                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-[var(--glass-border)]">
                                            <div className="flex items-center gap-2 mb-3 text-xs text-[var(--foreground-muted)]">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <polyline points="12 6 12 12 16 14" />
                                                </svg>
                                                Cached data - updated every 15 minutes
                                            </div>
                                            {loadingSections ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <div className="w-5 h-5 border-2 border-[var(--uh-red)] border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            ) : (sectionsCache[classKey] || []).filter(s => s.isOpen).length === 0 ? (
                                                <p className="text-[var(--foreground-muted)] text-sm text-center py-4">
                                                    No open sections in cache. Add the class to trigger a live fetch.
                                                </p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {(sectionsCache[classKey] || []).filter(s => s.isOpen).map((section, i) => (
                                                        <div
                                                            key={section.classNbr || i}
                                                            className="flex items-start justify-between p-3 rounded-lg bg-[var(--background)]/50 hover:bg-[var(--background)]/80 transition-colors"
                                                        >
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                                    <span className="font-medium">{section.instructor || 'TBA'}</span>
                                                                    <span className="text-green-400 text-sm">
                                                                        {section.seatsAvailable} open
                                                                    </span>
                                                                </div>
                                                                <div className="mt-1 text-sm text-[var(--foreground-muted)] ml-4">
                                                                    <p>Section {section.section} • {section.schedule || 'TBA'}</p>
                                                                    <p>{section.location || 'TBA'} • {section.enrollmentTotal}/{section.enrollmentCap} enrolled</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {sub.lastChecked && (
                                                <p className="mt-3 text-xs text-[var(--foreground-muted)] opacity-60">
                                                    Last checked: {new Date(sub.lastChecked).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="mt-8 p-4 rounded-lg bg-[var(--background-tertiary)] text-sm text-[var(--foreground-muted)]">
                    <p>
                        We check for class openings every 15 minutes. When a seat opens up,
                        you&apos;ll receive an email notification immediately.
                    </p>
                </div>
            </main>
        </div>
    );
}
