"use server";

import * as cheerio from "cheerio";

export interface QBitScoreResults {
  taskTitle: string;
  score: string;
}

export interface QBitResults {
  rank: string;
  studentName: string;
  taskScore: QBitScoreResults[];
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
          "Не знайдено таблицю результатів (#standingstable) на сторінці Q-bit.",
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
              : `Завдання ${i + 1}`
          );
        });
      }
    }
    console.log("Визначені заголовки завдань з Q-bit:", headerTaskTitles);

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

          const taskScore: QBitScoreResults[] = [];
          const numTasks =
            headerTaskTitles.length > 0
              ? headerTaskTitles.length
              : individualScoresRaw.length;

          for (let i = 0; i < numTasks; i++) {
            taskScore.push({
              taskTitle: headerTaskTitles[i] || `Завдання ${i + 1}`,
              score: individualScoresRaw[i] || "-",
            });
          }

          results.push({
            rank,
            studentName,
            taskScore,
            totalScore,
          });
        }
      }
    );

    return {
      data: results,
      taskTitles: headerTaskTitles.length > 0 ? headerTaskTitles : undefined,
    };
  } catch (error: any) {
    console.error("Failed to fetch or parse Q-bit data:", error);
    return {
      error: `Помилка отримання або обробки даних з Q-bit: ${error.message}`,
    };
  }
}
