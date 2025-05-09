"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";
import { UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

interface CreateGroupResult {
  success?: boolean;
  error?: string;
  groupId?: string;
  groupName?: string;
}

export async function createGroupAction(
  classIds: string[],
  groupName: string
): Promise<CreateGroupResult> {
  if (!groupName?.trim()) {
    return { error: "Назва групи не може бути порожньою." };
  }
  if (!classIds || classIds.length < 2) {
    return {
      error: "Для створення групи потрібно вибрати щонайменше два класи.",
    };
  }

  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user?.internalUserId) {
    return { error: "Користувач не авторизований." };
  }
  const userId = session.user.internalUserId;
  const userRole = session.user.role;

  if (userRole !== UserRole.TEACHER && userRole !== UserRole.ADMIN) {
    return {
      error:
        "Тільки викладачі або адміністратори можуть створювати групи класів.",
    };
  }

  try {
    if (userRole !== UserRole.ADMIN) {
      const ownedClassesCount = await prisma.class.count({
        where: {
          id: { in: classIds },
          teacherId: userId,
        },
      });
      if (ownedClassesCount !== classIds.length) {
        return {
          error: "Неможливо створити групу з класів, які вам не належать.",
        };
      }
    }

    const newGroup = await prisma.$transaction(async (tx) => {
      const createdGroup = await tx.linkedClassGroup.create({
        data: {
          name: groupName.trim(),
          userId: userId,
        },
      });

      for (const classId of classIds) {
        await tx.classLink.create({
          data: {
            groupId: createdGroup.id,
            classId: classId,
          },
        });
      }
      return createdGroup;
    });

    revalidatePath("/");

    return { success: true, groupId: newGroup.id, groupName: newGroup.name };
  } catch (error: any) {
    console.error("Failed to create linked class group:", error);
    if (error.code === "P2002") {
      return {
        error:
          "Помилка створення групи: можливо, група з такою назвою вже існує або виникла інша проблема унікальності.",
      };
    }
    return { error: `Помилка створення групи: ${error.message}` };
  }
}

interface DeleteGroupResult {
  success?: boolean;
  error?: string;
}

export async function deleteLinkedGroupAction(
  groupId: string
): Promise<DeleteGroupResult> {
  const session = (await getServerSession(authOptions)) as Session | null;
  if (!session?.user?.internalUserId) {
    return { error: "Користувач не авторизований." };
  }
  const currentUserId = session.user.internalUserId;
  const currentUserRole = session.user.role;

  try {
    const groupToDelete = await prisma.linkedClassGroup.findUnique({
      where: { id: groupId },
      select: { userId: true },
    });

    if (!groupToDelete) {
      return { error: "Групу не знайдено." };
    }

    if (
      currentUserRole !== UserRole.ADMIN &&
      groupToDelete.userId !== currentUserId
    ) {
      return { error: "Недостатньо прав для видалення цієї групи." };
    }

    await prisma.linkedClassGroup.delete({
      where: { id: groupId },
    });

    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete linked class group:", error);
    return { error: `Помилка видалення групи: ${error.message}` };
  }
}
