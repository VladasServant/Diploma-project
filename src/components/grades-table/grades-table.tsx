"use client";

import {
  useState,
  useEffect,
  useTransition,
  ChangeEvent,
  KeyboardEvent,
} from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateGrades } from "@/server-actions/gradesUpdate";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string | null;
}

interface Assignment {
  id: string;
  title: string;
}

interface Grade {
  studentId: string;
  assignmentId: string;
  gradeValue: string;
  id?: string;
  comment?: string | null;
  submittedAt?: Date | null;
  gradedAt?: Date;
  googleSubmissionId?: string | null;
}

interface GradesTableProps {
  students: Student[];
  assignments: Assignment[];
  initialGrades: Grade[];
  canEdit: boolean;
  classId: string;
}

export function GradesTable({
  students,
  assignments,
  initialGrades,
  canEdit,
  classId,
}: GradesTableProps) {
  const [grades, setGrades] = useState<Grade[]>(initialGrades);
  const [editingValues, setEditingValues] = useState<Record<string, string>>(
    {}
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setGrades(initialGrades);
    setEditingValues({});
  }, [initialGrades]);

  const getGradeDisplayValue = (
    studentId: string,
    assignmentId: string
  ): string => {
    const key = `${studentId}-${assignmentId}`;
    if (editingValues[key] !== undefined) {
      return editingValues[key];
    }
    const gradeEntry = grades.find(
      (g) => g.studentId === studentId && g.assignmentId === assignmentId
    );
    return gradeEntry?.gradeValue ?? "";
  };

  const handleInputChange = (
    studentId: string,
    assignmentId: string,
    value: string
  ) => {
    const key = `${studentId}-${assignmentId}`;
    setEditingValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveGrade = (studentId: string, assignmentId: string) => {
    const key = `${studentId}-${assignmentId}`;
    const newGradeValue = editingValues[key];

    if (newGradeValue === undefined) return;

    const currentValue =
      grades.find(
        (g) => g.studentId === studentId && g.assignmentId === assignmentId
      )?.gradeValue ?? "";

    if (newGradeValue === currentValue) {
      const newEditingValues = { ...editingValues };
      delete newEditingValues[key];
      setEditingValues(newEditingValues);
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateGrades({
          studentId,
          assignmentId,
          gradeValue: newGradeValue.trim() === "" ? null : newGradeValue.trim(),
          classId,
        });

        if (result?.error) {
          toast.error("Помилка збереження", { description: result.error });
        } else {
          toast.success("Оцінку збережено");
          const newEditingValues = { ...editingValues };
          delete newEditingValues[key];
          setEditingValues(newEditingValues);
        }
      } catch (e) {
        toast.error("Помилка збереження", {
          description: "Не вдалося зберегти оцінку.",
        });
      }
    });
  };

  const handleGenerateReport = (studentId: string) => {
    alert(`Генерація звіту для студента ID: ${studentId}`);
  };

  if (students.length === 0) return <p>Немає студентів.</p>;
  if (assignments.length === 0) return <p>Немає завдань.</p>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Студент</TableHead>
            {assignments.map((assignment) => (
              <TableHead key={assignment.id} className="text-center">
                {assignment.title}
              </TableHead>
            ))}
            <TableHead className="text-right">Дії</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell className="font-medium">
                {student.name ?? "Ім'я не вказано"}
              </TableCell>
              {assignments.map((assignment) => (
                <TableCell
                  key={`${student.id}-${assignment.id}`}
                  className="text-center px-1 py-1"
                >
                  {canEdit ? (
                    <Input
                      type="text"
                      className="h-8 text-center min-w-[60px]"
                      value={getGradeDisplayValue(student.id, assignment.id)}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleInputChange(
                          student.id,
                          assignment.id,
                          e.target.value
                        )
                      }
                      onBlur={() => handleSaveGrade(student.id, assignment.id)}
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      disabled={isPending}
                      aria-label={`Оцінка для ${student.name} за ${assignment.title}`}
                    />
                  ) : (
                    <span>
                      {getGradeDisplayValue(student.id, assignment.id)}
                    </span>
                  )}
                </TableCell>
              ))}
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateReport(student.id)}
                >
                  Зробити звіт
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
