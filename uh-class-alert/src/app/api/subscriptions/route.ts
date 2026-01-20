import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

interface Subscription {
    id: string;
    userId: string;
    subject: string;
    catalogNbr: string;
    title: string | null;
    active: boolean;
    createdAt: Date;
}

// GET /api/subscriptions - List user's subscriptions
export async function GET() {
    try {
        const { user } = await requireAuth();

        const subscriptions = await prisma.subscription.findMany({
            where: { userId: user.id, active: true },
            orderBy: { createdAt: 'desc' },
        }) as Subscription[];

        // Get current status of each class from cache
        const subscriptionsWithStatus = await Promise.all(
            subscriptions.map(async (sub: Subscription) => {
                const cached = await prisma.classCache.findUnique({
                    where: {
                        subject_catalogNbr: {
                            subject: sub.subject,
                            catalogNbr: sub.catalogNbr,
                        },
                    },
                });

                return {
                    ...sub,
                    isOpen: cached?.isOpen ?? false,
                    seatsAvailable: cached?.seatsAvailable ?? 0,
                    lastChecked: cached?.lastChecked ?? null,
                };
            })
        );

        return NextResponse.json({ subscriptions: subscriptionsWithStatus });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Get subscriptions error:', error);
        return NextResponse.json(
            { error: 'Failed to get subscriptions' },
            { status: 500 }
        );
    }
}

// POST /api/subscriptions - Add new subscription
export async function POST(request: NextRequest) {
    try {
        const { user } = await requireAuth();
        const body = await request.json();
        const { subject, catalogNbr, title } = body;

        if (!subject || !catalogNbr) {
            return NextResponse.json(
                { error: 'Subject and catalog number are required' },
                { status: 400 }
            );
        }

        // Check if subscription already exists
        const existing = await prisma.subscription.findUnique({
            where: {
                userId_subject_catalogNbr: {
                    userId: user.id,
                    subject: subject.toUpperCase(),
                    catalogNbr: catalogNbr.toString(),
                },
            },
        });

        if (existing) {
            if (existing.active) {
                return NextResponse.json(
                    { error: 'You are already subscribed to this class' },
                    { status: 400 }
                );
            }
            // Reactivate if it was deactivated
            const updated = await prisma.subscription.update({
                where: { id: existing.id },
                data: { active: true },
            });
            return NextResponse.json({ subscription: updated });
        }

        // Create new subscription
        const subscription = await prisma.subscription.create({
            data: {
                userId: user.id,
                subject: subject.toUpperCase(),
                catalogNbr: catalogNbr.toString(),
                title: title || null,
            },
        });

        return NextResponse.json({ subscription }, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Create subscription error:', error);
        return NextResponse.json(
            { error: 'Failed to create subscription' },
            { status: 500 }
        );
    }
}
