import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/auth/unsubscribe - Unsubscribe a user by email
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase();

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            // Don't reveal if user exists or not for privacy
            return NextResponse.json({
                success: true,
                message: 'If this email was registered, it has been unsubscribed.',
            });
        }

        // Deactivate all subscriptions for this user
        await prisma.subscription.updateMany({
            where: { userId: user.id },
            data: { active: false },
        });

        return NextResponse.json({
            success: true,
            message: 'You have been unsubscribed from all class alerts.',
        });
    } catch (error) {
        console.error('Unsubscribe error:', error);
        return NextResponse.json(
            { error: 'Failed to unsubscribe' },
            { status: 500 }
        );
    }
}
