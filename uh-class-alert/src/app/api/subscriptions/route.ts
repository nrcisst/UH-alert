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
        let { subject, catalogNbr } = body;

        if (!subject || !catalogNbr) {
            return NextResponse.json(
                { error: 'Subject and catalog number are required' },
                { status: 400 }
            );
        }

        subject = subject.toUpperCase();
        catalogNbr = catalogNbr.toString();

        // 1. Check if subscription already exists
        const existing = await prisma.subscription.findUnique({
            where: {
                userId_subject_catalogNbr: {
                    userId: user.id,
                    subject: subject,
                    catalogNbr: catalogNbr,
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

        // 2. Check Cache
        let cachedClass = await prisma.classCache.findUnique({
            where: {
                subject_catalogNbr: {
                    subject: subject,
                    catalogNbr: catalogNbr,
                },
            },
        });

        let title = cachedClass?.courseTitle || null;

        // 3. Cache Miss - Fetch Live Data
        if (!cachedClass) {
            console.log(`Cache miss for ${subject} ${catalogNbr}, fetching live...`);
            const { getAllSections, CURRENT_TERM, isClassOpen, getAvailableSeats } = await import('@/lib/uh-api');

            const sections = await getAllSections(CURRENT_TERM, subject, catalogNbr);

            if (!sections || sections.length === 0) {
                return NextResponse.json(
                    { error: `Class ${subject} ${catalogNbr} not found for current term.` },
                    { status: 404 }
                );
            }

            // Calculate aggregate status
            const isOpen = sections.some(s => isClassOpen(s));
            const seatsAvailable = sections.reduce((acc, s) => acc + getAvailableSeats(s), 0);
            title = sections[0].course_title;

            // Save to ClassCache
            cachedClass = await prisma.classCache.create({
                data: {
                    subject,
                    catalogNbr,
                    courseTitle: title,
                    isOpen,
                    seatsAvailable,
                    lastChecked: new Date(),
                },
            });

            // Save to SectionCache
            for (const section of sections) {
                await prisma.sectionCache.upsert({
                    where: {
                        classNbr: section.class_nbr || '',
                    },
                    update: {
                        isOpen: isClassOpen(section),
                        seatsAvailable: getAvailableSeats(section),
                        enrollmentCap: section.enrl_cap,
                        enrollmentTotal: section.enrl_tot,
                        lastChecked: new Date(),
                    },
                    create: {
                        classNbr: section.class_nbr || '',
                        subject: subject,
                        catalogNbr: catalogNbr,
                        section: section.class_section || '',
                        instructor: section.instructor_name,
                        schedule: section.schedule_day_time || '',
                        location: section.building_descr || '',
                        isOpen: isClassOpen(section),
                        seatsAvailable: getAvailableSeats(section),
                        enrollmentCap: section.enrl_cap,
                        enrollmentTotal: section.enrl_tot,
                        lastChecked: new Date(),
                    },
                });
            }
        }

        // 4. Create new subscription with verified title
        const subscription = await prisma.subscription.create({
            data: {
                userId: user.id,
                subject: subject,
                catalogNbr: catalogNbr,
                title: title, // Use verified title from cache/live
            },
        });

        return NextResponse.json({ subscription }, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.error('Create subscription error:', error);
        return NextResponse.json(
            { error: 'Failed to find or add class. Please check the info.' },
            { status: 500 }
        );
    }
}
