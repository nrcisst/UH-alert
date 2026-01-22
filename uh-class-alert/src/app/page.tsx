'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/subscriptions');
        if (res.ok) {
          // User is authenticated, redirect to dashboard
          router.push('/dashboard');
          return;
        }
      } catch {
        // Not authenticated, stay on landing page
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, [router]);

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--uh-red)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Check your email for a login link!' });
        setEmail('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Something went wrong' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send login email' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-gradient">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--background)]/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/University_of_Houston_Logo.svg.png" alt="UH" className="w-8 h-8" />
            <span className="font-semibold text-lg tracking-tight">Alert</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Never Miss a
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C8102E] to-[#e8354c]">
              Class Opening
            </span>
          </h1>
          <p className="text-xl text-[var(--foreground-muted)] max-w-2xl mx-auto mb-10">
            Get instant email alerts when seats open up in your desired UH classes.
            Stop refreshing the class browser — let us watch for you.
          </p>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="input flex-1"
                required
              />
              <button
                type="submit"
                className="btn-primary whitespace-nowrap"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Get Started →'}
              </button>
            </div>
            {message && (
              <p className={`mt-4 text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {message.text}
              </p>
            )}
          </form>
        </div>

        {/* How It Works */}
        <section className="mt-32">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center animate-fade-in cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--uh-red)]/10 transition-all duration-300" style={{ animationDelay: '0.1s' }}>
              <div className="text-4xl mb-4 font-bold text-[var(--uh-red)]">1</div>
              <h3 className="text-xl font-semibold mb-2">Sign Up</h3>
              <p className="text-[var(--foreground-muted)]">
                Enter your email and click the magic link to access your dashboard.
              </p>
            </div>
            <div className="card text-center animate-fade-in cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--uh-red)]/10 transition-all duration-300" style={{ animationDelay: '0.2s' }}>
              <div className="text-4xl mb-4 font-bold text-[var(--uh-red)]">2</div>
              <h3 className="text-xl font-semibold mb-2">Add Classes</h3>
              <p className="text-[var(--foreground-muted)]">
                Enter the subject and class number for any classes you want to watch.
              </p>
            </div>
            <div className="card text-center animate-fade-in cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--uh-red)]/10 transition-all duration-300" style={{ animationDelay: '0.3s' }}>
              <div className="text-4xl mb-4 font-bold text-[var(--uh-red)]">3</div>
              <h3 className="text-xl font-semibold mb-2">Get Notified</h3>
              <p className="text-[var(--foreground-muted)]">
                Receive an instant email alert when a seat opens up. Act fast!
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-32 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">FAQ</h2>
          <div className="space-y-6">
            <div className="card cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--uh-red)]/10 transition-all duration-300">
              <h3 className="font-semibold text-lg mb-2">How often do you check for openings?</h3>
              <p className="text-[var(--foreground-muted)]">
                We check every 15 minutes around the clock. When a class opens up, you&apos;ll get an email immediately.
              </p>
            </div>
            <div className="card cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--uh-red)]/10 transition-all duration-300">
              <h3 className="font-semibold text-lg mb-2">Which semester does this track?</h3>
              <p className="text-[var(--foreground-muted)]">
                We track the current registration semester. The system is updated at the start of each registration period (Spring, Summer, Fall).
              </p>
            </div>
            <div className="card cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--uh-red)]/10 transition-all duration-300">
              <h3 className="font-semibold text-lg mb-2">Is this free?</h3>
              <p className="text-[var(--foreground-muted)]">
                Yes! Alert is completely free to use. We built this to help fellow Coogs.
              </p>
            </div>
            <div className="card cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--uh-red)]/10 transition-all duration-300">
              <h3 className="font-semibold text-lg mb-2">How many classes can I watch?</h3>
              <p className="text-[var(--foreground-muted)]">
                You can add as many classes as you want. There&apos;s no limit!
              </p>
            </div>
            <div className="card cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:shadow-[var(--uh-red)]/10 transition-all duration-300">
              <h3 className="font-semibold text-lg mb-2">How do I stop receiving alerts?</h3>
              <p className="text-[var(--foreground-muted)]">
                You can remove individual classes from your dashboard, or click the unsubscribe link in any alert email to stop all notifications.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-[var(--foreground-muted)] text-sm">
          <p>Made with ❤️ for UH Students</p>
          <p className="mt-2">Not affiliated with the University of Houston.</p>
        </div>
      </footer>
    </div>
  );
}
