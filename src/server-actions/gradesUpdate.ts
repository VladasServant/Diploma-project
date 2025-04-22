"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";

interface UpdateGradeData {
  studentId: string;
  assignmentId: string;
  gradeValue: string | null;
  classId: string;
}

export async function updateGrades({
  studentId,
  assignmentId,
  gradeValue,
  classId,
}: UpdateGradeData): Promise<{ error?: string; success?: boolean }> {
  const session = (await getServerSession(authOptions)) as Session | null;

  if (!session?.user?.internalUserId) {
    return { error: "Не авторизовано" };
  }

  try {
    const course = await prisma.class.findUnique({
      where: { id: classId },
      select: { teacherId: true },
    });

    if (!course || course.teacherId !== session.user.internalUserId) {
      return { error: "Недостатньо прав для зміни оцінки в цьому класі" };
    }
  } catch (e) {
    console.error("Authorization check failed in updateGradeAction:", e);
    return { error: "Помилка перевірки прав доступу" };
  }

  try {
    if (gradeValue === null || gradeValue === "") {
      await prisma.grade.deleteMany({
        where: { studentId, assignmentId },
      });
    } else {
      await prisma.grade.upsert({
        where: { studentId_assignmentId: { studentId, assignmentId } },
        update: { gradeValue, gradedAt: new Date() },
        create: { studentId, assignmentId, gradeValue },
      });
    }

    revalidatePath(`/class-page/${classId}`);
    return { success: true };
  } catch (error) {
    console.error("Error updating grade:", error);
    return { error: "Помилка збереження оцінки в базі даних" };
  }
}
