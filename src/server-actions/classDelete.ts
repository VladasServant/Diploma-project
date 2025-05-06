"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { UserRole } from "@prisma/client";
import type { Session } from "next-auth";

export async function deleteClass(classId: string): Promise<{ error?: string; success?: boolean }> {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.internalUserId) {
        return { error: "Не авторизовано" };
    }
    const currentUserId = session.user.internalUserId;
    const currentUserRole = session.user.role;

    try {
        const classToDelete = await prisma.class.findUnique({
            where: { id: classId },
            select: { teacherId: true }
        });

        if (!classToDelete) {
            return { error: "Клас не знайдено" };
        }

        if (currentUserRole !== UserRole.ADMIN && classToDelete.teacherId !== currentUserId) {
             return { error: "Недостатньо прав для видалення цього класу" };
        }

        await prisma.class.delete({
            where: { id: classId },
        });
        revalidatePath('/');

        return { success: true };

    } catch (error) {
        console.error("Error deleting class:", error);
        return { error: "Помилка видалення класу з бази даних" };
    }
}