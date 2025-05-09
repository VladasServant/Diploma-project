import Link from "next/link";
import {
  Card,
  CardHeader,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, BookOpen, Trash2 } from "lucide-react";
import { MainNav } from "@/components/main-nav/main-nav";
import { prisma } from "@/lib/prisma";
import { Prisma, UserRole, LinkedClassGroup } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";
import { DataImporter } from "@/components/data-import/dataImport";
import { ClassListWithGrouping } from "@/components/group-class-list/group-class-list";
import { DeleteGroupButton } from "@/components/group-delete/group-delete";

type ClassWithTeacherName = Prisma.ClassGetPayload<{
  include: {
    teacher: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

export default async function Home() {
  const session = (await getServerSession(authOptions)) as Session | null;
  const currentUserId = session?.user?.internalUserId;
  const currentUserRole = session?.user?.role;

  let classes: ClassWithTeacherName[] = [];
  let linkedGroups: LinkedClassGroup[] = [];

  if (currentUserId) {
    if (currentUserRole === UserRole.ADMIN) {
      classes = await prisma.class.findMany({
        include: { teacher: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      });
      linkedGroups = await prisma.linkedClassGroup.findMany({
        orderBy: { createdAt: "desc" },
      });
    } else {
      classes = await prisma.class.findMany({
        where: {
          OR: [
            { teacherId: currentUserId },
            { enrollments: { some: { studentId: currentUserId } } },
          ],
        },
        include: { teacher: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      });
      if (currentUserRole === UserRole.TEACHER) { // Або ADMIN
        linkedGroups = await prisma.linkedClassGroup.findMany({
          where: { userId: currentUserId },
          orderBy: { createdAt: "desc" },
        });
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-14 flex items-center">
          <MainNav />
        </div>
      </header>

      <main className="p-4 md:p-8 space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Your classes</h2>
          {session?.user &&
            (currentUserRole === UserRole.TEACHER ||
              currentUserRole === UserRole.ADMIN) && (
              <div>
                <DataImporter />
              </div>
            )}
        </div>

        {!session?.user ? (
          <p>Будь ласка, увійдіть, щоб побачити ваші класи та групи.</p>
        ) : (
          <>
            {linkedGroups.length > 0 && (
              <section className="mb-10">
                <h3 className="text-2xl font-semibold tracking-tight mb-4 flex items-center">
                  <Layers className="mr-3 h-6 w-6 text-primary" />
                  Group classes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {linkedGroups.map((group) => (
                    <Card
                      key={group.id}
                      className="flex flex-col relative group"
                    >
                      <CardHeader className="flex-grow">
                        <Link
                          href={`/class-group/${group.id}`}
                          className="hover:text-primary"
                        >
                          <h3 className="text-xl">{group.name}</h3>
                        </Link>
                        <CardDescription>
                          Створено:{" "}
                          {new Date(group.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="flex justify-end">
                        <Link href={`/class-group/${group.id}`} passHref>
                          <Button variant="outline" size="sm">
                            Переглянути
                          </Button>
                        </Link>
                          <DeleteGroupButton groupId={group.id} className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity"/>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {(classes.length > 0 || linkedGroups.length === 0) && (
              <section>
                <h3 className="text-2xl font-semibold tracking-tight mb-4 flex items-center">
                  <BookOpen className="mr-3 h-6 w-6 text-primary" />
                  Imported classes
                </h3>
                <ClassListWithGrouping
                  classes={classes}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                />
              </section>
            )}

            {classes.length === 0 &&
              linkedGroups.length === 0 &&
              session?.user && (
                <p className="text-muted-foreground mt-4 text-center">
                  Немає доступних класів або груп. Спробуйте імпортувати новий
                  клас або створити групу класів.
                </p>
              )}
          </>
        )}
      </main>
    </div>
  );
}