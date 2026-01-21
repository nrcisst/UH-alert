import { NextRequest, NextResponse } from 'next/server';
import { getAllSections, CURRENT_TERM, getAvailableSeats, isClassOpen } from '@/lib/uh-api';
import prisma from '@/lib/db';

// GET /api/classes/sections - Get all sections for a class
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subject = searchParams.get('subject');
        const catalogNbr = searchParams.get('catalogNbr');

        if (!subject || !catalogNbr) {
            return NextResponse.json(
                { error: 'Subject and catalogNbr are required' },
                { status: 400 }
            );
        }

        const subjectUpper = subject.toUpperCase();

        // Get the previous cache status before fetching
        const previousCache = await prisma.classCache.findUnique({
            where: {
                subject_catalogNbr: {
                    subject: subjectUpper,
                    catalogNbr: catalogNbr,
                }
            }
        });

        const sections = await getAllSections(
            CURRENT_TERM,
            subjectUpper,
            catalogNbr
        );

        const formattedSections = sections.map(section => ({
            classNbr: section.class_nbr,
            section: section.class_section,
            instructor: section.instructor_name,
            schedule: section.schedule_day_time,
            location: section.building_descr,
            isOpen: isClassOpen(section),
            seatsAvailable: getAvailableSeats(section),
            enrollmentCap: section.enrl_cap,
            enrollmentTotal: section.enrl_tot,
            title: section.course_title,
        }));

        // Calculate aggregate status
        const openSections = formattedSections.filter(s => s.isOpen);
        const totalSeats = openSections.reduce((sum, s) => sum + s.seatsAvailable, 0);
        const hasOpenSeats = openSections.length > 0;

        // Update the cache in database (crowdsourced update)
        const wasUpdated = previousCache && previousCache.isOpen !== hasOpenSeats;

        await prisma.classCache.upsert({
            where: {
                subject_catalogNbr: {
                    subject: subjectUpper,
                    catalogNbr: catalogNbr,
                }
            },
            update: {
                isOpen: hasOpenSeats,
                seatsAvailable: totalSeats,
                lastChecked: new Date(),
            },
            create: {
                subject: subjectUpper,
                catalogNbr: catalogNbr,
                courseTitle: sections[0]?.course_title || null,
                isOpen: hasOpenSeats,
                seatsAvailable: totalSeats,
                lastChecked: new Date(),
            }
        });

        // Save each section to SectionCache
        for (const section of formattedSections) {
            if (section.classNbr) {
                await prisma.sectionCache.upsert({
                    where: { classNbr: section.classNbr },
                    update: {
                        section: section.section,
                        instructor: section.instructor,
                        schedule: section.schedule,
                        location: section.location,
                        isOpen: section.isOpen,
                        seatsAvailable: section.seatsAvailable,
                        enrollmentCap: section.enrollmentCap,
                        enrollmentTotal: section.enrollmentTotal,
                        lastChecked: new Date(),
                    },
                    create: {
                        classNbr: section.classNbr,
                        subject: subjectUpper,
                        catalogNbr: catalogNbr,
                        section: section.section,
                        instructor: section.instructor,
                        schedule: section.schedule,
                        location: section.location,
                        isOpen: section.isOpen,
                        seatsAvailable: section.seatsAvailable,
                        enrollmentCap: section.enrollmentCap,
                        enrollmentTotal: section.enrollmentTotal,
                        lastChecked: new Date(),
                    }
                });
            }
        }

        return NextResponse.json({
            sections: formattedSections,
            total: formattedSections.length,
            cacheUpdated: true,
            statusChanged: wasUpdated,
            previousStatus: previousCache?.isOpen ?? null,
            newStatus: hasOpenSeats,
        });
    } catch (error) {
        console.error('Sections fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch class sections' },
            { status: 500 }
        );
    }
}
