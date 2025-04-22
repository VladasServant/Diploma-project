"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { importCourseData, listClassroomCourses } from "@/server-actions/classroomActions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface SimpleCourse {
  id: string;
  name: string | null | undefined;
}

export function ClassroomImporter() {
    const [courses, setCourses] = useState<SimpleCourse[] | null>(null);
    const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFetchPending, startFetchTransition] = useTransition();
    const [isImportPending, startImportTransition] = useTransition();

    const handleFetchCourses = () => {
        setError(null);
        setCourses(null);
        setSelectedCourseIds(new Set());
        setIsLoading(true);

        startFetchTransition(async () => {
            const result = await listClassroomCourses();
            if (result.error) {
                setError(result.error);
                toast.error("Помилка отримання курсів", { description: result.error });
            } else {
                setCourses(result.courses || []);
                if (!result.courses || result.courses.length === 0) {
                     toast.info("Курси не знайдено", { description: "Не знайдено курсів, де ви є викладачем." });
                } else {
                     toast.success(`Знайдено ${result.courses.length} курс(ів).`);
                }
            }
            setIsLoading(false);
        });
    };

    const handleCheckboxChange = (courseId: string, checked: boolean | 'indeterminate') => {
        setSelectedCourseIds(prev => {
            const newSet = new Set(prev);
            if (checked === true) {
                newSet.add(courseId);
            } else {
                newSet.delete(courseId);
            }
            return newSet;
        });
    };

    const handleImportSelected = () => {
        if (selectedCourseIds.size === 0) {
            toast.warning("Не вибрано жодного курсу для імпорту.");
            return;
        }

        setIsImporting(true);
        setError(null);

        const idsToImport = Array.from(selectedCourseIds);

        startImportTransition(async () => {
            let successCount = 0;
            let errorCount = 0;

            for (const courseId of idsToImport) {
                try {
                    const result = await importCourseData(courseId);
                    if (result.error) {
                        errorCount++;
                        toast.error(`Помилка імпорту курсу ID: ${courseId}`, { description: result.error });
                    } else {
                        successCount++;
                        handleCheckboxChange(courseId, false);
                    }
                } catch (e) {
                    errorCount++;
                    toast.error(`Критична помилка імпорту курсу ID: ${courseId}`);
                }
            }

            setIsImporting(false);
            toast.success(`Імпорт завершено. Успішно: ${successCount}. З помилками: ${errorCount}.`);
            setSelectedCourseIds(new Set());
            setCourses(null);
        });
    };


    return (
        <div>
            <Button onClick={handleFetchCourses} disabled={isLoading || isFetchPending || isImporting}>
                {isFetchPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isLoading ? 'Завантаження...' : 'Отримати список курсів'}
            </Button>

            {courses !== null && courses.length > 0 && (
                <div className="space-y-3">
                    <h4 className="font-medium">Виберіть курси для імпорту:</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {courses.map(course => (
                            <div key={course.id} className="flex items-center space-x-2 border p-2 rounded">
                                <Checkbox
                                    id={`course-${course.id}`}
                                    checked={selectedCourseIds.has(course.id)}
                                    onCheckedChange={(checked) => handleCheckboxChange(course.id, checked)}
                                    disabled={isImporting}
                                />
                                <label
                                    htmlFor={`course-${course.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {course.name || `Курс без назви (ID: ${course.id})`}
                                </label>
                            </div>
                        ))}
                    </div>
                     <Button onClick={handleImportSelected} disabled={selectedCourseIds.size === 0 || isImportPending || isLoading}>
                         {isImportPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         Імпортувати вибрані ({selectedCourseIds.size})
                     </Button>
                </div>
            )}
             {courses !== null && courses.length === 0 && (
                 <p className="text-muted-foreground">Не знайдено курсів, де ви є викладачем.</p>
             )}
        </div>
    );
}