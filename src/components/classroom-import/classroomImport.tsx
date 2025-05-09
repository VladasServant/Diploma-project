"use client";

import { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { listClassroomCourses, importCourseData } from '@/server-actions/classroomActions';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

interface SimpleCourse { id: string; name: string | null | undefined; }

interface ClassroomImportFormProps {
    onImportComplete?: () => void;
}

export function ClassroomImportForm({ onImportComplete }: ClassroomImportFormProps) {
    const [courses, setCourses] = useState<SimpleCourse[] | null>(null);
    const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
    const [isFetching, startFetchingTransition] = useTransition();
    const [isImporting, startImportTransition] = useTransition();

    const handleFetchCourses = async () => {
        setCourses(null);
        setSelectedCourseIds(new Set());
        startFetchingTransition(async () => {
            const result = await listClassroomCourses();
            if (result.error) {
                toast.error("Помилка отримання курсів", { description: result.error });
            } else {
                setCourses(result.courses || []);
                if (!result.courses || result.courses.length === 0) {
                    toast.info("Курси Classroom не знайдено.");
                } else {
                    toast.success(`Знайдено ${result.courses.length} курс(ів).`);
                }
            }
        });
    };

    const handleSelectionChange = (courseId: string, checked: boolean | 'indeterminate') => {
        setSelectedCourseIds(prev => {
            const newSet = new Set(prev);
            if (checked === true) newSet.add(courseId); else newSet.delete(courseId);
            return newSet;
        });
    };

    const handleImport = async () => {
        if (selectedCourseIds.size === 0) {
            toast.warning("Не вибрано курси для імпорту.");
            return;
        }
        const idsToImport = Array.from(selectedCourseIds);
        startImportTransition(async () => {
            let successCount = 0; let errorCount = 0;
            for (const courseId of idsToImport) {
                const result = await importCourseData(courseId);
                if (result.error) { errorCount++; toast.error(`Помилка імпорту ID: ${courseId}`, { description: result.error });}
                else { successCount++; }
            }
            toast.info(`Імпорт Classroom: Успішно ${successCount}, Помилки ${errorCount}.`);
            if (successCount > 0 && onImportComplete) {
                onImportComplete();
            }
        });
    };

    return (
        <div className="space-y-4">
            <Button onClick={handleFetchCourses} disabled={isFetching || isImporting} className="w-full">
                {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Отримати список курсів Classroom
            </Button>
            {isFetching && <p className='text-sm text-center text-muted-foreground'>Завантаження списку курсів...</p>}

            {courses && courses.length > 0 && !isFetching && (
                <div className="space-y-3 mt-4">
                    <Label>Виберіть курси для імпорту:</Label>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-2 border p-2 rounded-md">
                        {courses.map(course => (
                            <div key={course.id} className="flex items-center space-x-2">
                                <Checkbox id={`classroom-${course.id}`} checked={selectedCourseIds.has(course.id)} onCheckedChange={(checked) => handleSelectionChange(course.id, checked as boolean)} disabled={isImporting} />
                                <Label htmlFor={`classroom-${course.id}`} className="text-sm font-medium leading-none cursor-pointer">{course.name || `Курс (ID: ${course.id})`}</Label>
                            </div>
                        ))}
                    </div>
                    <Button onClick={handleImport} disabled={selectedCourseIds.size === 0 || isImporting || isFetching} className="w-full">
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Імпортувати вибрані ({selectedCourseIds.size})
                    </Button>
                </div>
            )}
            {courses && courses.length === 0 && !isFetching && (<p className="text-muted-foreground text-center text-sm mt-2">Курси Classroom не знайдено.</p> )}
        </div>
    );
}