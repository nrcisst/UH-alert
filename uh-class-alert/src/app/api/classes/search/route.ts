import { NextRequest, NextResponse } from 'next/server';
import { searchClass, CURRENT_TERM, getAvailableSeats, isClassOpen } from '@/lib/uh-api';

// GET /api/classes/search - Search for a class
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

        const classData = await searchClass(
            CURRENT_TERM,
            subject.toUpperCase(),
            catalogNbr
        );

        if (!classData) {
            return NextResponse.json({
                found: false,
                message: 'Class not found',
            });
        }

        return NextResponse.json({
            found: true,
            class: {
                subject: classData.subject,
                catalogNbr: classData.catalog_nbr,
                title: classData.course_title,
                instructor: classData.instructor_name,
                isOpen: isClassOpen(classData),
                seatsAvailable: getAvailableSeats(classData),
                enrollmentCap: classData.enrl_cap,
            },
        });
    } catch (error) {
        console.error('Class search error:', error);
        return NextResponse.json(
            { error: 'Failed to search for class' },
            { status: 500 }
        );
    }
}
