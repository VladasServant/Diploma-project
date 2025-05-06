import { MainNav } from "@/components/main-nav/main-nav";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma, Class, UserRole } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";
import { ClassroomImporter } from "@/components/classroom-import/classroomImport";
import { ClassCardActions } from "@/components/class-delete/class-delete";
import { QBitImporter } from "@/components/qbit-import/qbitImport";
import { DataImporter } from "@/components/data-import/dataImport";

type ClassWithTeacherName = Prisma.ClassGetPayload<{
  include: { teacher: { select: { name: true; id: true } } };
}>;

export default async function Home() {
  const session = (await getServerSession(authOptions)) as Session | null;
  const currentUserId = session?.user?.internalUserId;
  const currentUserRole = session?.user?.role;

  let classes: ClassWithTeacherName[] = [];

  if (currentUserId) {
    if (currentUserRole === UserRole.ADMIN) {
      classes = await prisma.class.findMany({
        include: { teacher: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      });
    } else {
      classes = await prisma.class.findMany({
        where: {
          OR: [
            { teacherId: currentUserId },
            {
              enrollments: {
                some: {
                  studentId: currentUserId,
                },
              },
            },
          ],
        },
        include: {
          teacher: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: "asc" },
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-14 flex items-center">
          <MainNav />
        </div>
      </header>

      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Your classes</h2>

          {session?.user &&
            (session.user.role === UserRole.TEACHER ||
              session.user.role === UserRole.ADMIN) && (
              <div className="mb-8">
                <DataImporter />
              </div>
            )}
        </div>

        {!session?.user ? (
          <p>Будь ласка, увійдіть, щоб побачити ваші класи.</p>
        ) : classes.length === 0 ? (
          <p>Ще немає жодного класу. Спробуйте імпортувати новий.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => (
              <Card
                key={classItem.id}
                className="overflow-hidden relative group"
              >
                {(currentUserId === classItem.teacher.id ||
                  currentUserRole === UserRole.ADMIN) && (
                  <ClassCardActions
                    classId={classItem.id}
                    className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                )}
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <div>
                      <Link
                        href={`/class-page/${classItem.id}`}
                        className="hover:underline"
                      >
                        <h3 className="text-2xl">{classItem.name}</h3>
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {classItem.teacher?.name || "Не вказано"}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardFooter className="flex justify-end">
                  <Link href={`/class-page/${classItem.id}`} passHref>
                    <Button variant="outline">View Class</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
