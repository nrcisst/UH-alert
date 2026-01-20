import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// DELETE /api/subscriptions/[id] - Remove subscription
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await requireAuth();
        const { id } = await params;

        // Verify the subscription belongs to the user
        const subscription = await prisma.subscription.findFirst({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!subscription) {
            return NextResponse.json(
                { error: 'Subscription not found' },
                { status: 404 }
            );
        }

        // Soft delete by setting active to false
        await prisma.subscription.update({
            where: { id },
            data: { active: false },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Delete subscription error:', error);
        return NextResponse.json(
            { error: 'Failed to delete subscription' },
            { status: 500 }
        );
    }
}
