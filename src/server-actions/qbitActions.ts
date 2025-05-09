"use server";

import * as cheerio from "cheerio";
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Session } from "next-auth";
import { UserRole } from "@prisma/client";
import { revalidatePath } from 'next/cache';

export interface QBitScoreResults {
  taskIdentifier: string;
  score: string;
}

export interface QBitResults {
  rank: string;
  studentName: string;
  taskScores: QBitScoreResults[];
  totalScore: string;
}

export async function scrapeQBitStandings(
  cid: string
): Promise<{ data?: QBitResults[]; error?: string; taskTitles?: string[] }> {
  if (!cid?.trim()) {
    return { error: "Будь ласка, введіть ID курсу/турніру (cid)." };
  }

  const url = `https://qbit.dots.org.ua/standings?cid=${cid.trim()}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404)
        return {
          error: `Сторінку standings для cid=${cid} не знайдено (404). Перевірте ID.`,
        };
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const table = $("#standingstable");
    if (table.length === 0) {
      return {
        error:
          "Не знайдено таблицю результатів (#standingstable) на сторінці Q-Bit.",
      };
    }

    const results: QBitResults[] = [];
    let headerTaskTitles: string[] = [];

    const headerRow = table.find("thead tr, tr:first-child").first();
    if (headerRow.length > 0) {
      const headerCells = headerRow.find("th, td");
      if (headerCells.length > 3) {
        headerCells.slice(2, -1).each((i, cellElement) => {
          const cell = $(cellElement);

          let title = cell.find("a").attr("title")?.trim();

          if (!title || title === "-" || title === "=") {
            title = cell.text().trim();
          }

          const cleanedTitle = title?.replace(/^-:\s*/, "").trim();
          headerTaskTitles.push(
            cleanedTitle && cleanedTitle !== "-" && cleanedTitle !== "="
              ? cleanedTitle
              : `Завдання ${ i + 1 }`,
          );
        });
      }
    }

    const dataRows = table.find("tbody tr");
    (dataRows.length ? dataRows : table.find("tr")).each(
      (index, rowElement) => {
        const row = $(rowElement);
        const firstCellText = row.find("th, td").first().text().trim();
        if (
          firstCellText.includes("Підсумки") ||
          firstCellText.includes("Середній бал") ||
          firstCellText === "Місце" ||
          !firstCellText.match(/^\d+(-\d+)?\.?$/)
        ) {
          return;
        }

        const cells = row.find("td");
        const rowDataText: string[] = [];
        cells.each((i, cell) => {
          rowDataText.push($(cell).text().trim());
        });

        if (rowDataText.length > 2) {
          const rank = rowDataText[0];
          const studentName = rowDataText[1];
          const individualScoresRaw = rowDataText.slice(2, -1);
          const totalScore = rowDataText[rowDataText.length - 1];

          const taskScores: QBitScoreResults[] = [];
          const numTasks =
            headerTaskTitles.length > 0
              ? headerTaskTitles.length
              : individualScoresRaw.length;

          for (let i = 0; i < numTasks; i++) {
            taskScores.push({
              taskIdentifier: headerTaskTitles[i] || `Завдання ${i + 1}`,
              score: individualScoresRaw[i] || "-",
            }); 
          }

          results.push({
            rank,
            studentName,
            taskScores,
            totalScore,
          });
        }
      }
    );

    // Сортування по імені студенту за алфавітом
    // results.sort((a, b) => {
    //   return a.studentName.localeCompare(b.studentName, 'uk');
    // });

    return {
      data: results,
      taskTitles: headerTaskTitles.length > 0 ? headerTaskTitles : undefined,
    };
  } catch (error: any) {
    console.error("Failed to fetch or parse Q-Bit data:", error);
    return {
      error: `Помилка отримання або обробки даних з Q-Bit: ${error.message}`,
    };
  }
}

export async function saveQbitDataToDb(
  cid: string,
  scrapedData: QBitResults[],
  taskTitles: string[],
  qbitCourseNameProvided?: string
): Promise<{ success?: boolean; message?: string; error?: string; classId?: string }> {

  const session = await getServerSession(authOptions) as Session | null;
  if (!session?.user?.internalUserId) {
      return { error: "Користувач не авторизований." };
  }
  const importerInternalUserId = session.user.internalUserId;
  const importerRole = session.user.role;

  if (importerRole !== UserRole.TEACHER && importerRole !== UserRole.ADMIN) {
      return { error: "Недостатньо прав для імпорту та збереження даних." };
  }

  const courseName = qbitCourseNameProvided || `Q-Bit Турнір (cid: ${cid})`;
  let newOrUpdatedClassId: string | undefined = undefined;

  try {
      await prisma.$transaction(async (tx) => {
          const classInDb = await tx.class.upsert({
              where: { qbitCid: cid },
              update: {
                  name: courseName,
                  description: `Дані імпортовано з Q-Bit standings, cid: ${cid}`,
                  sourcePlatform: "QBIT",
              },
              create: {
                  name: courseName,
                  description: `Дані імпортовано з Q-Bit standings, cid: ${cid}`,
                  teacherId: importerInternalUserId,
                  qbitCid: cid,
                  sourcePlatform: "QBIT",
              }
          });
          newOrUpdatedClassId = classInDb.id;

          const assignmentMap = new Map<string, string>();
          for (const taskIdentifier of taskTitles) {
              if (!taskIdentifier) continue;
              const assignmentInDb = await tx.assignment.upsert({
                where: {
                    classId_qbitTaskIdentifier: { 
                        classId: newOrUpdatedClassId!,
                        qbitTaskIdentifier: taskIdentifier
                    }
                  },
                  update: { title: taskIdentifier },
                    create: {
                        title: taskIdentifier,
                        classId: newOrUpdatedClassId!,
                        qbitTaskIdentifier: taskIdentifier,
                    }
              });
              assignmentMap.set(taskIdentifier, assignmentInDb.id);
          }
          const totalScoreAssignment = await tx.assignment.upsert({
               where: { 
                   classId_qbitTaskIdentifier: {
                       classId: newOrUpdatedClassId!, 
                       qbitTaskIdentifier: "Q-Bit Підсумок",
                   }
               },
               update: {},
               create: { title: "Q-Bit Підсумок", classId: newOrUpdatedClassId!, qbitTaskIdentifier: "Q-Bit Підсумок" }
          });

          for (const studentData of scrapedData) {
              let studentInDb = await tx.user.findFirst({ where: { name: studentData.studentName } });
              if (!studentInDb) {
                  studentInDb = await tx.user.create({ data: { name: studentData.studentName, role: UserRole.STUDENT } });
              }
              const internalStudentId = studentInDb.id;

              await tx.studentEnrollment.upsert({
                  where: { classId_studentId: { classId: newOrUpdatedClassId!, studentId: internalStudentId } },
                  update: {}, create: { classId: newOrUpdatedClassId!, studentId: internalStudentId }
              });

              for (const taskScore of studentData.taskScores) {
                  const internalAssignmentId = assignmentMap.get(taskScore.taskIdentifier);
                  if (internalAssignmentId && taskScore.score && taskScore.score !== '-') {
                      await tx.grade.upsert({
                          where: { studentId_assignmentId: { studentId: internalStudentId, assignmentId: internalAssignmentId } },
                          update: { gradeValue: taskScore.score },
                          create: { studentId: internalStudentId, assignmentId: internalAssignmentId, gradeValue: taskScore.score }
                      });
                  }
              }
              if (studentData.totalScore && studentData.totalScore !== '-') {
                   await tx.grade.upsert({
                      where: { studentId_assignmentId: { studentId: internalStudentId, assignmentId: totalScoreAssignment.id } },
                      update: { gradeValue: studentData.totalScore },
                      create: { studentId: internalStudentId, assignmentId: totalScoreAssignment.id, gradeValue: studentData.totalScore }
                  });
              }
          }
      }, { timeout: 120000, maxWait: 20000 });

      if (newOrUpdatedClassId) {
          revalidatePath('/');
          revalidatePath(`/class-page/${newOrUpdatedClassId}`);
      }

      return { success: true, message: `Дані для Q-Bit турніру "${courseName}" (cid: ${cid}) успішно збережено.`, classId: newOrUpdatedClassId };

  } catch (error: any) {
      console.error("Failed to save Q-Bit data to DB:", error);
      return { error: `Помилка збереження даних Q-Bit: ${error.message}` };
  }
}