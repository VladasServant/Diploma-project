import { notFound } from "next/navigation";
import { Metadata } from "next";
import { MainNav } from "@/components/main-nav/main-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GradesTable } from "@/components/grades-table/grades-table";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";

async function getClassDetails(classId: string) {
  try {
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        teacher: { select: { name: true, email: true } },
        assignments: { orderBy: { title: "asc" } },
        enrollments: {
          include: {
            student: { select: { id: true, name: true } },
          },
          orderBy: { student: { name: "asc" } },
        },
      },
    });

    if (!classData) return null;

    const studentIds = classData.enrollments.map((en) => en.studentId);
    const assignmentIds = classData.assignments.map((as) => as.id);

    const grades = await prisma.grade.findMany({
      where: {
        studentId: { in: studentIds },
        assignmentId: { in: assignmentIds },
      },
    });

    const students = classData.enrollments.map((en) => en.student);

    return {
      classInfo: {
        id: classData.id,
        name: classData.name,
        description: classData.description,
        teacherName: classData.teacher?.name || "N/A",
      },
      students: students,
      assignments: classData.assignments,
      grades: grades,
    };
  } catch (error) {
    console.error("Failed to fetch class details:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const awaitedParams = await params;
  const id = awaitedParams.id;
  const details = await getClassDetails(id);
  return {
    title: details?.classInfo
      ? `${details.classInfo.name} | Learning Platform`
      : "Клас не знайдено",
  };
}

export default async function ClassPage({
  params,
}: {
  params: { id: string };
}) {
  const awaitedParams = await params;
  const id = awaitedParams.id;

  const session = (await getServerSession(authOptions)) as Session | null;

  const details = await getClassDetails(id);

  if (!details) {
    notFound();
  }

  const { classInfo, students, assignments, grades } = details;

  let canEditGrades = false;

  const classDataFromDb = await prisma.class.findUnique({
    where: { id: classInfo.id },
    select: { teacherId: true },
  });
  const teacherId = classDataFromDb?.teacherId;

  if (
    session?.user?.internalUserId &&
    session.user.role === UserRole.TEACHER &&
    session.user.internalUserId === teacherId
  ) {
    canEditGrades = true;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-14 flex items-center">
          <MainNav />
        </div>
      </header>

      <main className="p-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {classInfo.name}
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Викладач: {classInfo.teacherName}
        </p>

        <Tabs defaultValue="grades" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="overview">Огляд</TabsTrigger>
            <TabsTrigger value="students">Студенти</TabsTrigger>
            <TabsTrigger value="assignments">Завдання</TabsTrigger>
            <TabsTrigger value="grades">Оцінки</TabsTrigger>
            <TabsTrigger value="reports">Звітність</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 rounded-md border p-4">
            <h2 className="text-xl font-semibold mb-2">Опис Класу</h2>
            <p>{classInfo.description || "Опис класу відсутній."}</p>
          </TabsContent>

          <TabsContent value="students" className="mt-4 rounded-md border p-4">
            <h2 className="text-xl font-semibold mb-2">Список Студентів</h2>
            {students && students.length > 0 ? (
              <ul className="list-disc pl-5">
                {students.map((student) => (
                  <li key={student.id}>{student.name ?? "Ім'я не вказано"}</li>
                ))}
              </ul>
            ) : (
              <p>Студентів не зараховано.</p>
            )}
          </TabsContent>

          <TabsContent
            value="assignments"
            className="mt-4 rounded-md border p-4"
          >
            <h2 className="text-xl font-semibold mb-2">Завдання</h2>
            {assignments && assignments.length > 0 ? (
              <ul className="list-disc pl-5">
                {assignments.map((assignment) => (
                  <li key={assignment.id}>{assignment.title}</li>
                ))}
              </ul>
            ) : (
              <p>Завдань для цього класу немає.</p>
            )}
          </TabsContent>

          <TabsContent value="grades" className="mt-4">
            <h2 className="text-xl font-semibold mb-4">Журнал Оцінок</h2>
            <GradesTable
              students={students || []}
              assignments={assignments || []}
              initialGrades={grades || []}
              canEdit={canEditGrades}
              classId={classInfo.id}
            />
          </TabsContent>

          <TabsContent value="reports" className="mt-4 rounded-md border p-4">
            <h2 className="text-xl font-semibold mb-2">
              Консолідована Звітність
            </h2>
            <p>
              Ця секція може містити інший вигляд звітів або інструменти для їх
              генерації.
            </p>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
