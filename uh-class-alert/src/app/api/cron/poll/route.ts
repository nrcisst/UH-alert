import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchOpenClasses, CURRENT_TERM, getAvailableSeats, isClassOpen } from '@/lib/uh-api';
import { sendClassAlert } from '@/lib/email';

interface SubscriptionWithUser {
    id: string;
    userId: string;
    subject: string;
    catalogNbr: string;
    title: string | null;
    active: boolean;
    createdAt: Date;
    user: {
        id: string;
        email: string;
        emailVerified: boolean;
    };
}

const CRON_SECRET = process.env.CRON_SECRET;

// GET /api/cron/poll - Main polling job
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const { searchParams } = new URL(request.url);
        const secret = searchParams.get('secret');

        if (secret !== CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const results = {
            subjectsPolled: 0,
            classesUpdated: 0,
            alertsSent: 0,
            errors: [] as string[],
        };

        // Get all unique subjects that have active subscriptions
        const activeSubjects = await prisma.subscription.findMany({
            where: { active: true },
            select: { subject: true },
            distinct: ['subject'],
        });

        const subjects = activeSubjects.map((s: { subject: string }) => s.subject);
        console.log(`Polling ${subjects.length} subjects:`, subjects);

        for (const subject of subjects) {
            try {
                results.subjectsPolled++;

                // Fetch all open classes for this subject
                const response = await fetchOpenClasses(CURRENT_TERM, subject);
                const openClasses = response.data;

                // Create a map of open classes for quick lookup
                const openClassMap = new Map<string, boolean>();
                for (const cls of openClasses) {
                    const seats = getAvailableSeats(cls);
                    if (seats > 0) {
                        openClassMap.set(cls.catalog_nbr, true);
                    }
                }

                // Get all subscriptions for this subject
                const subscriptions = await prisma.subscription.findMany({
                    where: { subject, active: true },
                    include: { user: true },
                }) as SubscriptionWithUser[];

                // Get unique catalog numbers we're watching
                const watchedCatalogNbrs = Array.from(new Set(subscriptions.map((s) => s.catalogNbr)));

                for (const catalogNbr of watchedCatalogNbrs) {
                    // Find class data if it's open
                    const classData = openClasses.find(c => c.catalog_nbr === catalogNbr);
                    const currentlyOpen = classData ? isClassOpen(classData) : false;
                    const seatsAvailable = classData ? getAvailableSeats(classData) : 0;

                    // Get cached state
                    const cached = await prisma.classCache.findUnique({
                        where: { subject_catalogNbr: { subject, catalogNbr } },
                    });

                    const wasOpen = cached?.isOpen ?? false;

                    // Update cache
                    await prisma.classCache.upsert({
                        where: { subject_catalogNbr: { subject, catalogNbr } },
                        create: {
                            subject,
                            catalogNbr,
                            courseTitle: classData?.course_title || null,
                            instructorName: classData?.instructor_name || null,
                            isOpen: currentlyOpen,
                            seatsAvailable,
                            enrollmentCap: classData?.enrl_cap || 0,
                            lastChecked: new Date(),
                            lastOpenedAt: currentlyOpen ? new Date() : null,
                        },
                        update: {
                            courseTitle: classData?.course_title || cached?.courseTitle,
                            instructorName: classData?.instructor_name || cached?.instructorName,
                            isOpen: currentlyOpen,
                            seatsAvailable,
                            enrollmentCap: classData?.enrl_cap || cached?.enrollmentCap || 0,
                            lastChecked: new Date(),
                            lastOpenedAt: currentlyOpen && !wasOpen ? new Date() : cached?.lastOpenedAt,
                        },
                    });

                    results.classesUpdated++;

                    // Check if class just opened (transition from closed to open)
                    if (currentlyOpen && !wasOpen && classData) {
                        console.log(`Class opened: ${subject} ${catalogNbr}`);

                        // Find all users subscribed to this class
                        const usersToAlert = subscriptions.filter(s => s.catalogNbr === catalogNbr);

                        for (const sub of usersToAlert) {
                            // Check if we already sent an alert in the last 24 hours
                            const recentAlert = await prisma.alertLog.findFirst({
                                where: {
                                    userId: sub.userId,
                                    subject,
                                    catalogNbr,
                                    sentAt: {
                                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                                    },
                                },
                            });

                            if (recentAlert) {
                                console.log(`Skipping alert for ${sub.user.email} - already sent recently`);
                                continue;
                            }

                            try {
                                // Send email alert
                                await sendClassAlert(sub.user.email, {
                                    subject,
                                    catalogNbr,
                                    courseTitle: classData.course_title,
                                    instructorName: classData.instructor_name,
                                    seatsAvailable,
                                });

                                // Log the alert
                                await prisma.alertLog.create({
                                    data: {
                                        userId: sub.userId,
                                        subject,
                                        catalogNbr,
                                    },
                                });

                                results.alertsSent++;
                                console.log(`Alert sent to ${sub.user.email} for ${subject} ${catalogNbr}`);
                            } catch (emailError) {
                                console.error(`Failed to send alert to ${sub.user.email}:`, emailError);
                                results.errors.push(`Email to ${sub.user.email} failed`);
                            }
                        }
                    }
                }

                // Small delay between subjects to avoid overwhelming UH API
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (subjectError) {
                console.error(`Error polling subject ${subject}:`, subjectError);
                results.errors.push(`Subject ${subject} failed`);
            }
        }

        console.log('Poll complete:', results);

        return NextResponse.json({
            success: true,
            ...results,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Cron poll error:', error);
        return NextResponse.json(
            { error: 'Poll failed', details: String(error) },
            { status: 500 }
        );
    }
}
