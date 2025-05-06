"use client";

import { useState, useTransition, ChangeEvent, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

import { listClassroomCourses, importCourseData } from '@/server-actions/classroomActions';
import { scrapeQBitStandings, QBitResults } from '@/server-actions/qbitActions';
import { toast } from "sonner";
import { Loader2, BookOpen, Code2, PlusCircle, ArrowLeft } from 'lucide-react';

interface SimpleCourse { id: string; name: string | null | undefined; }
type ImportSource = null | 'google_classroom' | 'qBit';

export function DataImporter() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeSource, setActiveSource] = useState<ImportSource>(null);

    const [classroomCourses, setClassroomCourses] = useState<SimpleCourse[] | null>(null);
    const [selectedClassroomCourseIds, setSelectedClassroomCourseIds] = useState<Set<string>>(new Set());
    const [isFetchingCourses, startFetchingCoursesTransition] = useTransition();
    const [isImportingClassroom, startImportClassroomTransition] = useTransition();

    const [qBitCid, setQBitCid] = useState('');
    const [qBitTaskTitles, setQBitTaskTitles] = useState<string[] | undefined>(undefined);
    const [qBitScrapedData, setQBitScrapedData] = useState<QBitResults[] | null>(null);
    const [isScrapingQBit, startScrapingQBitTransition] = useTransition();

    const resetInternalStates = () => {
        setClassroomCourses(null);
        setSelectedClassroomCourseIds(new Set());
        setQBitCid('');
        setQBitScrapedData(null);
        setQBitTaskTitles(undefined);
    };

    const handlePlatformSelect = (platform: ImportSource) => {
        resetInternalStates();
        setActiveSource(platform);
    };

    const goBackToPlatformChoice = () => {
        resetInternalStates();
        setActiveSource(null);
    };

    const handleDialogClose = () => {
        goBackToPlatformChoice();
        setIsDialogOpen(false);
    }

    const handleFetchClassroom = async () => {
        setClassroomCourses(null);
        setSelectedClassroomCourseIds(new Set());
        startFetchingCoursesTransition(async () => {
            const result = await listClassroomCourses();
            if (result.error) {
                toast.error("Помилка отримання курсів Classroom", { description: result.error });
            } else {
                setClassroomCourses(result.courses || []);
                if (!result.courses || result.courses.length === 0) {
                    toast.info("Курси Classroom не знайдено.");
                } else {
                    toast.success(`Знайдено ${result.courses.length} курс(ів) Classroom.`);
                }
            }
        });
    };

    const handleClassroomSelectionChange = (courseId: string, checked: boolean | 'indeterminate') => {
        setSelectedClassroomCourseIds(prev => {
            const newSet = new Set(prev);
            if (checked === true) newSet.add(courseId); else newSet.delete(courseId);
            return newSet;
        });
    };

    const handleImportSelectedFromClassroom = async () => {
        if (selectedClassroomCourseIds.size === 0) {
            toast.warning("Не вибрано курси Classroom для імпорту.");
            return;
        }
        const idsToImport = Array.from(selectedClassroomCourseIds);
        startImportClassroomTransition(async () => {
            let successCount = 0; let errorCount = 0;
            for (const courseId of idsToImport) {
                const result = await importCourseData(courseId);
                if (result.error) { errorCount++; toast.error(`Помилка імпорту курсу Classroom ID: ${courseId}`, { description: result.error });}
                else { successCount++; }
            }
            toast.info(`Імпорт Classroom: Успішно ${successCount}, Помилки ${errorCount}.`);
            if (successCount > 0) { handleDialogClose(); }
        });
    };

    const handleFetchQBitData = async () => {
        setQBitScrapedData(null);
        setQBitTaskTitles(undefined);
        startScrapingQBitTransition(async () => {
            const result = await scrapeQBitStandings(qBitCid);
            if (result.error) {
                toast.error("Помилка отримання даних з Q-Bit", { description: result.error });
                setQBitScrapedData([]);
            } else {
                setQBitScrapedData(result.data || []);
                setQBitTaskTitles(result.taskTitles);
                toast.success(`Дані Q-Bit для cid=${qBitCid} отримано. Знайдено: ${result.data?.length || 0}.`);
            }
        });
    };


     const currentQBitTaskTitles = qBitTaskTitles && qBitTaskTitles.length > 0
        ? qBitTaskTitles
        : qBitScrapedData?.[0]?.taskScore.map(ts => ts.taskTitle || '') || [];


    return (
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
                goBackToPlatformChoice();
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className='bg-black text-white'>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Імпортувати Клас
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
                {!activeSource ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Вибір Джерела Імпорту</DialogTitle>
                            <DialogDescription>
                                Оберіть платформу, з якої ви бажаєте імпортувати дані класу.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                            <Button onClick={() => handlePlatformSelect('google_classroom')} variant="outline" className="w-full h-28 flex flex-col items-center justify-center text-center p-2">
                                <BookOpen className="mb-2 h-8 w-8" /> Google Classroom
                            </Button>
                            <Button onClick={() => handlePlatformSelect('qBit')} variant="outline" className="w-full h-28 flex flex-col items-center justify-center text-center p-2">
                                <Code2 className="mb-2 h-8 w-8" /> Q-Bit (Standings)
                            </Button>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Скасувати</Button>
                            </DialogClose>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                             <div className="flex items-center space-x-2 relative mb-2">
                                <Button variant="ghost" size="icon" onClick={goBackToPlatformChoice} className="absolute left-0 top-0 h-full">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <DialogTitle className="text-center flex-grow pt-1">
                                     Імпорт з {activeSource === 'google_classroom' ? 'Google Classroom' : 'Q-Bit'}
                                </DialogTitle>
                            </div>
                        </DialogHeader>

                        {activeSource === 'google_classroom' && (
                            <div className="space-y-4 py-2 overflow-y-auto flex-grow">
                                <Button onClick={handleFetchClassroom} disabled={isFetchingCourses || isImportingClassroom} className="w-full">
                                    {isFetchingCourses && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Отримати список курсів
                                </Button>
                                {isFetchingCourses && <p className='text-sm text-center text-muted-foreground'>Завантаження...</p>}
                                {classroomCourses && classroomCourses.length > 0 && !isFetchingCourses && (
                                    <div className="space-y-3">
                                        <Label>Виберіть курси:</Label>
                                        <div className="max-h-40 overflow-y-auto space-y-1 pr-2 border p-2 rounded-md">
                                            {classroomCourses.map(course => (
                                                <div key={course.id} className="flex items-center space-x-2">
                                                    <Checkbox id={`classroom-${course.id}`} checked={selectedClassroomCourseIds.has(course.id)} onCheckedChange={(checked) => handleClassroomSelectionChange(course.id, checked as boolean)} disabled={isImportingClassroom} />
                                                    <Label htmlFor={`classroom-${course.id}`} className="text-sm font-medium leading-none cursor-pointer">{course.name || `Курс (ID: ${course.id})`}</Label>
                                                </div>
                                            ))}
                                        </div>
                                        <Button onClick={handleImportSelectedFromClassroom} disabled={selectedClassroomCourseIds.size === 0 || isImportingClassroom || isFetchingCourses} className="w-full">
                                            {isImportingClassroom && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Імпортувати вибрані ({selectedClassroomCourseIds.size})
                                        </Button>
                                    </div>
                                )}
                                {classroomCourses && classroomCourses.length === 0 && !isFetchingCourses && (<p className="text-muted-foreground text-center text-sm mt-2">Курси Classroom не знайдено.</p> )}
                            </div>
                        )}

                        {activeSource === 'qBit' && (
                            <div className="space-y-4 py-2 overflow-y-auto flex-grow">
                                <div className='space-y-1'>
                                    <Label htmlFor="qBit-cid">ID Курсу/Турніру Q-Bit (cid)</Label>
                                    <Input id="qBit-cid" value={qBitCid} onChange={(e: ChangeEvent<HTMLInputElement>) => setQBitCid(e.target.value)} placeholder="напр. 101" disabled={isScrapingQBit} />
                                </div>
                                <Button onClick={handleFetchQBitData} disabled={isScrapingQBit || !qBitCid} className="w-full">
                                    {isScrapingQBit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Отримати дані з Q-Bit
                                </Button>
                                {isScrapingQBit && <p className='text-sm text-center text-muted-foreground'>Завантаження...</p>}
                                
                                {qBitScrapedData && qBitScrapedData.length > 0 && !isScrapingQBit && (
                                     <div className='mt-2 space-y-2'>
                                         <h4 className="font-medium">Попередній перегляд даних Q-Bit:</h4>
                                         <div className="rounded-md border max-h-40 overflow-y-auto">
                                             <Table>
                                                 <TableHeader>
                                                     <TableRow>
                                                         <TableHead className="w-[60px] sticky top-0 left-0 bg-secondary z-10">Місце</TableHead>
                                                         <TableHead className="sticky top-0 left-[60px] bg-secondary z-10 min-w-[150px]">Учасник</TableHead>
                                                         {currentQBitTaskTitles.map((title, index) => (
                                                             <TableHead key={`qBit-task-header-${index}`} className="text-center min-w-[70px] sticky top-0 bg-secondary z-10">{title || `Завдання ${index+1}`}</TableHead>
                                                         ))}
                                                         <TableHead className="text-right sticky top-0 right-0 bg-secondary z-10 min-w-[70px]">Усього</TableHead>
                                                     </TableRow>
                                                 </TableHeader>
                                                 <TableBody>
                                                     {qBitScrapedData.map((item, studentIndex) => (
                                                         <TableRow key={`${item.studentName}-${studentIndex}`}>
                                                             <TableCell className="sticky left-0 bg-background">{item.rank}</TableCell>
                                                             <TableCell className="sticky left-[60px] bg-background">{item.studentName}</TableCell>
                                                             {currentQBitTaskTitles.map((_, taskIndex) => (
                                                                 <TableCell key={`qBit-score-${studentIndex}-${taskIndex}`} className="text-center">
                                                                     {item.taskScore[taskIndex]?.score || '-'}
                                                                 </TableCell>
                                                             ))}
                                                             <TableCell className="text-right sticky right-0 bg-background">{item.totalScore}</TableCell>
                                                         </TableRow>
                                                     ))}
                                                 </TableBody>
                                             </Table>
                                         </div>
                                         <p className='text-xs text-muted-foreground'>Показано {qBitScrapedData.length} записів.</p>
                                         <Button variant="outline" className='w-full mt-2' onClick={()=> alert("Логіка збереження Q-Bit даних в БД ще не реалізована.")}>
                                             Зберегти дані Q-Bit (TODO)
                                         </Button>
                                     </div>
                                )}
                                 {qBitScrapedData && qBitScrapedData.length === 0 && !isScrapingQBit && (<p className="text-muted-foreground text-center text-sm mt-2">Дані Q-Bit не знайдено.</p> )}
                            </div>
                        )}
                         <DialogFooter className="sm:justify-start pt-4 mt-auto">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" onClick={goBackToPlatformChoice}>Закрити</Button>
                            </DialogClose>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}