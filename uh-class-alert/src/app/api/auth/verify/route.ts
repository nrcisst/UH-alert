import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.redirect(new URL('/?error=missing_token', request.url));
        }

        // Find user with this token
        const user = await prisma.user.findFirst({
            where: { verifyToken: token },
        });

        if (!user) {
            return NextResponse.redirect(new URL('/?error=invalid_token', request.url));
        }

        // Clear the token and mark email as verified
        await prisma.user.update({
            where: { id: user.id },
            data: {
                verifyToken: null,
                emailVerified: true,
            },
        });

        // Create session
        await createSession(user.id, user.email);

        // Redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (error) {
        console.error('Verify error:', error);
        return NextResponse.redirect(new URL('/?error=verification_failed', request.url));
    }
}
