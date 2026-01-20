const UH_API_URL = process.env.UH_API_URL || 'https://classbrowser.uh.edu/api/classes';

export interface UHClass {
    catalog_nbr: string;
    course_title: string;
    instructor_name: string;
    enrl_cap: number;
    enrl_tot: number;
    subject: string;
}

export interface ClassSearchResult {
    data: UHClass[];
    total: number;
}

/**
 * Fetch all open classes for a given subject
 */
export async function fetchOpenClasses(term: string, subject: string): Promise<ClassSearchResult> {
    const params = new URLSearchParams({
        term,
        subject,
        classStatus: 'open',
        weekendu: '0',
    });

    const response = await fetch(`${UH_API_URL}?${params.toString()}`, {
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`UH API error: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Search for a specific class
 */
export async function searchClass(
    term: string,
    subject: string,
    catalogNbr: string
): Promise<UHClass | null> {
    const params = new URLSearchParams({
        term,
        subject,
        catalogNumber: catalogNbr,
        weekendu: '0',
    });

    const response = await fetch(`${UH_API_URL}?${params.toString()}`, {
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`UH API error: ${response.statusText}`);
    }

    const result: ClassSearchResult = await response.json();

    return result.data.find(c => c.catalog_nbr === catalogNbr) || null;
}

/**
 * Get available seats for a class
 */
export function getAvailableSeats(classData: UHClass): number {
    return classData.enrl_cap - classData.enrl_tot;
}

/**
 * Check if a class is open
 */
export function isClassOpen(classData: UHClass): boolean {
    return getAvailableSeats(classData) > 0;
}

// Current term code - update this each semester
export const CURRENT_TERM = '2280'; // Spring 2028

// Common UH subjects
export const UH_SUBJECTS = [
    'COSC', 'MATH', 'PHYS', 'CHEM', 'BIOL', 'ENGL', 'HIST',
    'POLS', 'PSYC', 'ECON', 'ACCT', 'FINA', 'MANA', 'MARK',
    'ECE', 'MECE', 'CHEE', 'CIVE', 'INDE', 'PETR',
];
