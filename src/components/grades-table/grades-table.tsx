"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface Student {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  title: string;
}

interface Grade {
  studentId: string;
  assignmentId: string;
  grade: string | number | null;
}

interface GradesTableProps {
  students: Student[];
  assignments: Assignment[];
  grades: Grade[];
}

export function GradesTable({
  students,
  assignments,
  grades,
}: GradesTableProps) {
  const getGrade = (studentId: string, assignmentId: string): string => {
    const gradeEntry = grades.find(
      (g) => g.studentId === studentId && g.assignmentId === assignmentId
    );
    return gradeEntry?.grade?.toString() ?? "-";
  };

  const handleGenerateReport = (studentId: string) => {
    alert(`Генерація звіту для студента ID: ${studentId}`);
  };

  if (students.length === 0) {
    return <p>Немає студентів для відображення оцінок.</p>;
  }
  if (assignments.length === 0) {
    return <p>Немає завдань для відображення оцінок.</p>;
  }

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
              <TableCell className="font-medium">{student.name}</TableCell>
              {assignments.map((assignment) => (
                <TableCell
                  key={`${student.id}-${assignment.id}`}
                  className="text-center"
                >
                  {getGrade(student.id, assignment.id)}
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
