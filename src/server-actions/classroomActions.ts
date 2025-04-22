"use server";

import { getServerSession } from "next-auth/next";
import { google, classroom_v1 } from "googleapis";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";

interface SimpleCourse {
  id: string;
  name: string | null | undefined;
}

export async function listClassroomCourses(): Promise<{
  courses?: SimpleCourse[];
  error?: string;
}> {

  const session = (await getServerSession(authOptions)) as Session | null;

  if (!session?.accessToken) {
    return {
      error: "Користувач не авторизований або відсутній токен доступу.",
    };
  }

  const accessToken = session.accessToken;
  const accessTokenExpires = session.accessTokenExpires;

  if (!accessTokenExpires || Date.now() > accessTokenExpires) {
    console.warn(
      "Access Token expired or expiry unknown. Refresh logic needed."
    );

    return { error: "Термін дії токену доступу сплив або невідомий." };
  }

  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const classroom = google.classroom({ version: "v1", auth: oauth2Client });

    const response = await classroom.courses.list({ teacherId: "me" });
    const courses = response.data.courses || [];

    return {
      courses: courses.map((course) => ({ id: course.id!, name: course.name })),
    };
  } catch (error: any) {
    console.error("Google Classroom API error in listClassroomCourses:", error);
    if (error.code === 401 || error.code === 403) {
      return {
        error:
          "Помилка авторизації або недостатньо прав доступу до Google Classroom API.",
      };
    }
    return { error: "Не вдалося отримати список курсів з Google Classroom." };
  }
}


export async function importCourseData(
  courseId: string
): Promise<{ success: boolean; error?: string; message?: string }> {

  const session = (await getServerSession(authOptions)) as Session & {
    user: { id: string; role?: UserRole };
  };
  if (!session?.user?.id)
    return {
      success: false,
      error: "Не вдалося отримати ID користувача з сесії.",
    };
  if (!session?.accessToken)
    return { success: false, error: "Відсутній токен доступу." };

  const importerUserId = session.user.id;
  const accessToken = session.accessToken;

  if (!session.accessTokenExpires || Date.now() > session.accessTokenExpires) {
    console.warn(`Access Token expired for course import: ${courseId}`);
    return { success: false, error: "Термін дії токену доступу сплив." };
  }

  const importerUser = await prisma.user.findUnique({
    where: { googleUserId: importerUserId },
    select: { id: true, role: true },
  });

  if (!importerUser)
    return {
      success: false,
      error: "Користувача-імпортера не знайдено в базі даних.",
    };
  if (
    importerUser.role !== UserRole.TEACHER &&
    importerUser.role !== UserRole.ADMIN
  ) {
    return {
      success: false,
      error: "Тільки викладачі або адміністратори можуть імпортувати класи.",
    };
  }
  const internalImporterId = importerUser.id;

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const classroom = google.classroom({ version: "v1", auth: oauth2Client });

  let internalClassId: string | null = null;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const courseInfo = (await classroom.courses.get({ id: courseId })).data;
        const teacherProfile = (
          await classroom.userProfiles.get({
            userId: courseInfo?.ownerId ?? "me",
          })
        ).data;

        if (!teacherProfile?.emailAddress)
          throw new Error("Не вдалося отримати email викладача.");

        await tx.user.upsert({
          where: { email: teacherProfile.emailAddress },
          update: {
            name: teacherProfile.name?.fullName,
            googleUserId: teacherProfile.id,
          },
          create: {
            email: teacherProfile.emailAddress,
            name: teacherProfile.name?.fullName,
            googleUserId: teacherProfile.id,
            role: "TEACHER",
          },
        });

        const upsertedClass = await tx.class.upsert({
          where: { googleClassroomId: courseId },
          update: {
            name: courseInfo.name ?? "Клас без назви",
            description: courseInfo.description,
            teacherId: internalImporterId,
          },
          create: {
            googleClassroomId: courseId,
            name: courseInfo.name ?? "Клас без назви",
            description: courseInfo.description,
            teacherId: internalImporterId,
          },
        });
        internalClassId = upsertedClass.id;

        const studentListResponse = await classroom.courses.students.list({
          courseId,
        });
        const classroomStudents = studentListResponse.data.students || [];
        const studentMap = new Map<string, string>(); // googleId -> internalId
        for (const student of classroomStudents) {
          if (student.profile?.emailAddress && student.userId) {
            const upsertedStudent = await tx.user.upsert({
              where: { email: student.profile.emailAddress },
              update: {
                name: student.profile.name?.fullName,
                googleUserId: student.userId,
              },
              create: {
                email: student.profile.emailAddress,
                name: student.profile.name?.fullName,
                googleUserId: student.userId,
                role: "STUDENT",
              },
            });
            const currentInternalStudentId = upsertedStudent.id;
            studentMap.set(student.userId, currentInternalStudentId);
            await tx.studentEnrollment.upsert({
              where: {
                classId_studentId: {
                  classId: internalClassId,
                  studentId: currentInternalStudentId,
                },
              },
              update: {},
              create: {
                classId: internalClassId,
                studentId: currentInternalStudentId,
              },
            });
          }
        }

        const assignmentsListResponse = await classroom.courses.courseWork.list(
          { courseId }
        );
        const classroomAssignments =
          assignmentsListResponse.data.courseWork || [];
        const assignmentMap = new Map<string, string>(); // googleId -> internalId
        for (const assignment of classroomAssignments) {
          if (assignment.id) {
            let prismaDueDate: Date | null = null;
            if (
              assignment.dueDate &&
              typeof assignment.dueDate.year === "number" &&
              typeof assignment.dueDate.month === "number" &&
              typeof assignment.dueDate.day === "number"
            ) {
              prismaDueDate = new Date(
                Date.UTC(
                  assignment.dueDate.year,
                  assignment.dueDate.month - 1,
                  assignment.dueDate.day
                )
              );
            }
            const upsertedAssignment = await tx.assignment.upsert({
              where: { googleAssignmentId: assignment.id },
              update: {
                title: assignment.title ?? "Завдання без назви",
                description: assignment.description,
                dueDate: prismaDueDate,
                maxPoints: assignment.maxPoints,
                classId: internalClassId,
              },
              create: {
                googleAssignmentId: assignment.id,
                title: assignment.title ?? "Завдання без назви",
                description: assignment.description,
                dueDate: prismaDueDate,
                maxPoints: assignment.maxPoints,
                classId: internalClassId,
              },
            });
            assignmentMap.set(assignment.id, upsertedAssignment.id);
          }
        }

        const submissionsListResponse =
          await classroom.courses.courseWork.studentSubmissions.list({
            courseId: courseId,
            courseWorkId: "-",
          });
        const classroomSubmissions =
          submissionsListResponse.data.studentSubmissions || [];
        for (const submission of classroomSubmissions) {
          const internalStudentId = studentMap.get(submission.userId!);
          const internalAssignmentId = assignmentMap.get(
            submission.courseWorkId!
          );
          if (
            internalStudentId &&
            internalAssignmentId &&
            submission.assignedGrade !== null &&
            submission.assignedGrade !== undefined
          ) {
            await tx.grade.upsert({
              where: {
                studentId_assignmentId: {
                  studentId: internalStudentId,
                  assignmentId: internalAssignmentId,
                },
              },
              update: {
                gradeValue: submission.assignedGrade.toString(),
                gradedAt: submission.updateTime
                  ? new Date(submission.updateTime)
                  : new Date(),
                googleSubmissionId: submission.id,
              },
              create: {
                studentId: internalStudentId,
                assignmentId: internalAssignmentId,
                gradeValue: submission.assignedGrade.toString(),
                gradedAt: submission.updateTime
                  ? new Date(submission.updateTime)
                  : new Date(),
                googleSubmissionId: submission.id,
              },
            });
          }
        }

        return {
          success: true,
          message: `Курс "${
            courseInfo.name ?? courseId
          }" успішно імпортовано/оновлено.`,
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    if (result.success && internalClassId) {
      revalidatePath("/");
      revalidatePath(`/class-page/${internalClassId}`);
    }

    return { success: true, message: result.message };
  } catch (error: any) {
    console.error(
      `[${courseId}] Error importing course data (Transaction or API Error):`,
      error
    );
    return {
      success: false,
      error: `Не вдалося імпортувати дані курсу: ${
        error.message || "Невідома помилка транзакції або API"
      }`,
    };
  }
}