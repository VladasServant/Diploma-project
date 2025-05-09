import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { MainNav } from '@/components/main-nav/main-nav';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";
import { UserRole } from "@prisma/client";
import { LinkedGroupGradesView } from '@/components/group-class-grades-table/group-class-grades-table'; 

export interface ClassInfoForGroup {
    id: string;
    name: string;
    description?: string | null;
    teacherName?: string | null;
    teacherId?: string;
    sourcePlatform?: string | null;
}
export interface StudentForGroup {
    id: string;
    name: string | null;
    email?: string | null;
    googleUserId?: string | null;
}
export interface AssignmentForGroup {
    id: string;
    title: string;
    classId: string;
    maxPoints?: number | null;
    qbitTaskIdentifier?: string | null;
    googleAssignmentId?: string | null;
}
export interface GradeForGroup {
    id?: string;
    studentId: string;
    assignmentId: string;
    gradeValue: string;
}

export interface ClassDetailsForGroupView {
    classInfo: ClassInfoForGroup;
    students: StudentForGroup[];
    assignments: AssignmentForGroup[];
    grades: GradeForGroup[];
}

export interface LinkedGroupViewData {
    groupId: string;
    groupName: string;
    classesData: ClassDetailsForGroupView[];
}

interface LinkedGroupPageParams {
    params: { groupId: string; };
}

async function getLinkedGroupDetailsForPage(groupId: string, currentUserId: string, currentUserRole?: UserRole): Promise<LinkedGroupViewData | null> {
    try {
        const group = await prisma.linkedClassGroup.findUnique({
            where: {
                id: groupId,
                ...(currentUserRole !== UserRole.ADMIN && { userId: currentUserId })
            },
            include: {
                classLinks: {
                    orderBy: { class: { name: 'asc' } },
                    include: {
                        class: {
                            include: {
                                teacher: { select: { id: true, name: true } },
                                assignments: { orderBy: { title: 'asc' } },
                                enrollments: {
                                    include: {
                                        student: { select: { id: true, name: true, email: true, googleUserId: true } }
                                    },
                                    orderBy: { student: { name: 'asc' } }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!group || !group.classLinks || group.classLinks.length === 0) return null;

        const classesDetailsPromises = group.classLinks.map(async (link) => {
            const classData = link.class;
            if (!classData) return null;

            const studentIds = classData.enrollments.map(en => en.studentId);
            const assignmentIds = classData.assignments.map(as => as.id);

            const grades = await prisma.grade.findMany({
                where: {
                    studentId: { in: studentIds.length > 0 ? studentIds : ["dummy_id_to_avoid_error"] },
                    assignmentId: { in: assignmentIds.length > 0 ? assignmentIds : ["dummy_id_to_avoid_error"] }
                },
                select: { id: true, studentId: true, assignmentId: true, gradeValue: true }
            });

            const students = classData.enrollments.map(en => ({
                id: en.student.id,
                name: en.student.name,
                email: en.student.email,
                googleUserId: en.student.googleUserId
            }));
            
            const assignmentsWithClassId = classData.assignments.map(a => ({
                 ...a,
                 classId: classData.id
            }));

            return {
                classInfo: {
                    id: classData.id,
                    name: classData.name,
                    description: classData.description,
                    teacherName: classData.teacher?.name || 'N/A',
                    teacherId: classData.teacherId,
                    sourcePlatform: classData.sourcePlatform,
                },
                students: students,
                assignments: assignmentsWithClassId,
                grades: grades,
            };
        });

        const resolvedClassesDetails = (await Promise.all(classesDetailsPromises)).filter(Boolean) as ClassDetailsForGroupView[];

        return {
            groupId: group.id,
            groupName: group.name,
            classesData: resolvedClassesDetails
        };

    } catch (error) {
        console.error("Failed to fetch linked group details:", error);
        return null;
    }
}

export async function generateMetadata({ params }: LinkedGroupPageParams): Promise<Metadata> {
    const awaitedParams = await params;
    const group = await prisma.linkedClassGroup.findUnique({ where: { id: awaitedParams.groupId }, select: { name: true } });
    return { title: group ? `Група: ${group.name}` : 'Група не знайдена' };
}

export default async function LinkedGroupPage({ params }: LinkedGroupPageParams) {
    const awaitedParams = await params;
    const session = await getServerSession(authOptions) as Session | null;
    const currentUserId = session?.user?.internalUserId;
    const currentUserRole = session?.user?.role;

    if (!currentUserId) {
        return <div className="p-8 text-center">Потрібна авторизація для перегляду цієї сторінки.</div>;
    }

    const groupViewData = await getLinkedGroupDetailsForPage(awaitedParams.groupId, currentUserId, currentUserRole);

    if (!groupViewData) {
        notFound();
    }

    const canEditFlags = groupViewData.classesData.map(cd =>
        (currentUserRole === UserRole.ADMIN) ||
        (currentUserRole === UserRole.TEACHER && currentUserId === cd.classInfo.teacherId)
    );

    return (
        <div className="min-h-screen bg-background">
             <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                 <div className="h-14 flex items-center"> <MainNav /> </div>
             </header>
             <main className="p-4 md:p-8 space-y-6">
                 <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{groupViewData.groupName}</h1>
                 
                 <LinkedGroupGradesView
                    groupName={groupViewData.groupName}
                    classesData={groupViewData.classesData}
                    canEditFlags={canEditFlags}
                 />
             </main>
        </div>
    );
}