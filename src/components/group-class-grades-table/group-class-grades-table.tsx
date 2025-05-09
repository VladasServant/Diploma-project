"use client";

import { useMemo } from 'react';
import { GradesTable } from '@/components/grades-table/grades-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { 
  ClassDetailsForGroupView,
  StudentForGroup,
  AssignmentForGroup,
  GradeForGroup 
} from '@/app/class-group/[groupId]/page';

interface CombinedStudent extends StudentForGroup {}
interface CombinedAssignment extends AssignmentForGroup { originalClassId: string; }
interface CombinedGrade extends GradeForGroup {}

interface CombinedData {
    students: CombinedStudent[];
    assignments: CombinedAssignment[];
    grades: CombinedGrade[];
}

interface LinkedGroupGradesViewProps {
    groupName: string;
    classesData: ClassDetailsForGroupView[];
    canEditFlags: boolean[];
}

export function LinkedGroupGradesView({ groupName, classesData, canEditFlags }: LinkedGroupGradesViewProps) {
    const defaultTabValue = classesData?.[0]?.classInfo?.id || 'combined';

    const combinedData = useMemo((): CombinedData => {
        if (!classesData || classesData.length === 0) {
            return { students: [], assignments: [], grades: [] };
        }

        const allStudentsMap = new Map<string, CombinedStudent>();
        classesData.forEach(classDetail => {
            classDetail.students.forEach(student => {
                if (!allStudentsMap.has(student.id)) {
                    allStudentsMap.set(student.id, student);
                }
            });
        });
        const combinedStudents = Array.from(allStudentsMap.values())
            .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'uk'));

        const combinedAssignmentsMap = new Map<string, CombinedAssignment>();
        classesData.forEach(classDetail => {
            classDetail.assignments.forEach(assignment => {
                const uniqueAssignmentKey = `${classDetail.classInfo.id}-${assignment.id}`;
                if (!combinedAssignmentsMap.has(uniqueAssignmentKey)) {
                    combinedAssignmentsMap.set(uniqueAssignmentKey, {
                        ...assignment,
                        id: uniqueAssignmentKey,
                        title: `[${classDetail.classInfo.name.substring(0, 4).trim()}] ${assignment.title}`,
                        originalClassId: classDetail.classInfo.id,
                    });
                }
            });
        });
        const combinedAssignments = Array.from(combinedAssignmentsMap.values())
            .sort((a,b) => a.title.localeCompare(b.title, 'uk'));

        let combinedGrades: CombinedGrade[] = [];
        classesData.forEach(classDetail => {
            classDetail.grades.forEach(grade => {
                const studentInCombined = allStudentsMap.get(grade.studentId);
                const originalAssignmentKey = `${classDetail.classInfo.id}-${grade.assignmentId}`;
                const assignmentInCombined = combinedAssignmentsMap.get(originalAssignmentKey);

                if (studentInCombined && assignmentInCombined) {
                    combinedGrades.push({
                        ...grade,
                        studentId: studentInCombined.id,
                        assignmentId: assignmentInCombined.id,
                    });
                }
            });
        });

        return { students: combinedStudents, assignments: combinedAssignments, grades: combinedGrades };
    }, [classesData]);

    return (
        <Tabs defaultValue={defaultTabValue} className="w-full">
            <TabsList 
                className="grid w-full h-auto"
                style={{gridTemplateColumns: `repeat(${Math.max(1, classesData.length + 1)}, minmax(0, 1fr))`}}
            >
                 {classesData.map((classDetail) => (
                     <TabsTrigger key={classDetail.classInfo.id} value={classDetail.classInfo.id} className="px-2 py-1.5 text-xs sm:text-sm whitespace-nowrap">
                         {classDetail.classInfo.name}
                     </TabsTrigger>
                 ))}
                 <TabsTrigger value="combined" className="px-2 py-1.5 text-xs sm:text-sm whitespace-nowrap">
                    Консолідована
                 </TabsTrigger>
            </TabsList>

            {classesData.map((classDetail, index) => (
                <TabsContent key={classDetail.classInfo.id} value={classDetail.classInfo.id} className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Оцінки: {classDetail.classInfo.name}</CardTitle>
                            {classDetail.classInfo.sourcePlatform && (
                                <CardDescription>Джерело: {classDetail.classInfo.sourcePlatform}</CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            <GradesTable
                                students={classDetail.students}
                                assignments={classDetail.assignments}
                                initialGrades={classDetail.grades}
                                canEdit={canEditFlags[index]}
                                classId={classDetail.classInfo.id}
                            />
                        </CardContent>
                    </Card>
                 </TabsContent>
             ))}

            <TabsContent value="combined" className="mt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Консолідовані Оцінки: {groupName}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {combinedData.students.length > 0 && combinedData.assignments.length > 0 ? (
                            <GradesTable
                                students={combinedData.students}
                                assignments={combinedData.assignments}
                                initialGrades={combinedData.grades}
                                
                                canEdit={false} 
                                classId={"combined_view"}
                            />
                        ) : (
                            <p className="text-muted-foreground">Немає даних для відображення консолідованої таблиці.</p>
                        )}
                    </CardContent>
                </Card>
             </TabsContent>
        </Tabs>
    );
}