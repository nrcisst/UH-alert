import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendMagicLink } from '@/lib/email';
import { generateVerifyToken } from '@/lib/auth';

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

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Find or create user
        let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        const token = generateVerifyToken();

        if (user) {
            // Update verify token
            user = await prisma.user.update({
                where: { id: user.id },
                data: { verifyToken: token },
            });
        } else {
            // Create new user
            user = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    verifyToken: token,
                },
            });
        }

        // Send magic link
        await sendMagicLink(email.toLowerCase(), token);

        return NextResponse.json({
            success: true,
            message: 'Check your email for a login link!',
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Failed to send login email' },
            { status: 500 }
        );
    }
}
