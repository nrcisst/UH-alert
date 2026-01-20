import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const SESSION_COOKIE = 'uh-session';
const SESSION_EXPIRY = 60 * 60 * 24 * 30; // 30 days

interface SessionPayload {
    userId: string;
    email: string;
}

export function generateVerifyToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function createSessionToken(payload: SessionPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_EXPIRY });
}

export function verifySessionToken(token: string): SessionPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as SessionPayload;
    } catch {
        return null;
    }
}

export async function createSession(userId: string, email: string) {
    const token = createSessionToken({ userId, email });
    const cookieStore = await cookies();

    cookieStore.set(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_EXPIRY,
        path: '/',
    });

    return token;
}

export async function getSession(): Promise<SessionPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) return null;

    return verifySessionToken(token);
}

export async function destroySession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
}

export async function requireAuth() {
    const session = await getSession();

    if (!session) {
        throw new Error('Unauthorized');
    }

    // Verify user still exists
    const user = await prisma.user.findUnique({
        where: { id: session.userId },
    });

    if (!user) {
        await destroySession();
        throw new Error('Unauthorized');
    }

    return { user, session };
}
