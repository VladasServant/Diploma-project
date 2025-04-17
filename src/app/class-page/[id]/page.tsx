import { notFound } from "next/navigation";
import { Metadata } from "next";
import { MainNav } from "@/components/main-nav/main-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GradesTable } from "@/components/grades-table/grades-table";

const dummyClasses = [
  {
    id: "1",
    name: "Математичний Аналіз I",
    teacherName: "Проф. Степаненко В. О.",
    description:
      "Базовий курс математичного аналізу: границі, похідні, інтеграли.",
    students: [
      { id: "101", name: "Іван Петренко" },
      { id: "102", name: "Олена Ковальчук" },
      { id: "105", name: "Василь Сидоренко" },
    ],
    assignments: [
      { id: "a1", title: "ДР №1: Границі" },
      { id: "a2", title: "КР №1: Похідні" },
      { id: "a3", title: "ДР №2: Інтеграли" },
    ],
    grades: [
      { studentId: "101", assignmentId: "a1", grade: "90" },
      { studentId: "101", assignmentId: "a2", grade: "85" },
      { studentId: "102", assignmentId: "a1", grade: "95" },
      { studentId: "102", assignmentId: "a2", grade: "88" },
      { studentId: "101", assignmentId: "a3", grade: "75" },
      { studentId: "105", assignmentId: "a2", grade: "80" },
      { studentId: "105", assignmentId: "a3", grade: "92" },
    ],
  },
  {
    id: "2",
    name: "Основи Програмування (Python)",
    teacherName: "Доц. Мельник А. П.",
    description:
      "Вступ до програмування на мові Python: типи даних, цикли, функції.",
    students: [
      { id: "103", name: "Сергій Василенко" },
      { id: "104", name: "Марія Сидоренко" },
    ],
    assignments: [
      { id: "py1", title: "Завдання 1: Змінні" },
      { id: "py2", title: "Завдання 2: Цикли" },
    ],
    grades: [
      { studentId: "103", assignmentId: "py1", grade: "100" },
      { studentId: "104", assignmentId: "py1", grade: "90" },
      { studentId: "104", assignmentId: "py2", grade: "95" },
    ],
  },
  {
    id: "3",
    name: "Всесвітня Історія (World History)",
    teacherName: "Пані Давис (Ms. Davis)",
    description: "Огляд ключових подій світової історії.",
    assignments: [{ id: "h1", title: "Реферат: Стародавній Рим" }],
    grades: [{ studentId: "110", assignmentId: "h1", grade: "A+" }],
  },
];

async function getDummyClassData(classId: string) {
  const data = dummyClasses.find((cls) => cls.id === classId);
  return Promise.resolve(data);
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const id = params.id;
  const classData = await getDummyClassData(id);
  return {
    title: classData
      ? `${classData.name} | Learning Platform`
      : "Клас не знайдено",
  };
}

export default async function ClassPage({
  params,
}: {
  params: { id: string };
}) {
  const id = params.id;
  const classData = await getDummyClassData(id);

  if (!classData) {
    notFound();
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
          {classData.name}
        </h1>
        <p className="text-lg text-muted-foreground mb-6">
          Викладач: {classData.teacherName || "N/A"}
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
            <p>{classData.description || "Опис класу відсутній."}</p>
          </TabsContent>
          <TabsContent value="students" className="mt-4 rounded-md border p-4">
            <h2 className="text-xl font-semibold mb-2">Список Студентів</h2>
            {classData.students && classData.students.length > 0 ? (
              <ul className="list-disc pl-5">
                {" "}
                {classData.students.map((student) => (
                  <li key={student.id}>{student.name}</li>
                ))}{" "}
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
            {classData.assignments && classData.assignments.length > 0 ? (
              <ul className="list-disc pl-5">
                {" "}
                {classData.assignments.map((assignment) => (
                  <li key={assignment.id}>{assignment.title}</li>
                ))}{" "}
              </ul>
            ) : (
              <p>Завдань для цього класу немає.</p>
            )}
          </TabsContent>

          <TabsContent value="grades" className="mt-4">
            <h2 className="text-xl font-semibold mb-4">Журнал Оцінок</h2>
            <GradesTable
              students={classData.students || []}
              assignments={classData.assignments || []}
              grades={classData.grades || []}
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
