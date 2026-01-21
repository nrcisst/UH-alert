import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET /api/classes/cached-sections - Get cached sections for a class (no live fetch)
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

        const sections = await prisma.sectionCache.findMany({
            where: {
                subject: subject.toUpperCase(),
                catalogNbr: catalogNbr,
            },
            orderBy: { section: 'asc' },
        });

        return NextResponse.json({
            sections: sections.map(s => ({
                classNbr: s.classNbr,
                section: s.section,
                instructor: s.instructor,
                schedule: s.schedule,
                location: s.location,
                isOpen: s.isOpen,
                seatsAvailable: s.seatsAvailable,
                enrollmentCap: s.enrollmentCap,
                enrollmentTotal: s.enrollmentTotal,
                lastChecked: s.lastChecked,
            })),
            total: sections.length,
            fromCache: true,
        });
    } catch (error) {
        console.error('Cached sections fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cached sections' },
            { status: 500 }
        );
    }
}
