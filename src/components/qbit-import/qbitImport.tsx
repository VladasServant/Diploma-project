"use client";

import { useState, useTransition, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { scrapeQBitStandings, saveQbitDataToDb, QBitResults } from '@/server-actions/qbitActions';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

interface QBitImportFormProps {
    onImportComplete?: () => void;
}

export function QbitImportForm({ onImportComplete }: QBitImportFormProps) {
    const [qbitCid, setQbitCid] = useState('');
    const [qbitCourseName, setQbitCourseName] = useState('');
    const [qbitTaskTitles, setQbitTaskTitles] = useState<string[] | undefined>(undefined);
    const [qbitScrapedData, setQbitScrapedData] = useState<QBitResults[] | null>(null);
    
    const [isScraping, startScrapingTransition] = useTransition();
    const [isSaving, startSavingTransition] = useTransition();

    const handleFetch = async () => {
        setQbitScrapedData(null);
        setQbitTaskTitles(undefined);
        startScrapingTransition(async () => {
            const result = await scrapeQBitStandings(qbitCid);
            if (result.error) {
                toast.error("Помилка отримання даних з Q-Bit", { description: result.error });
                setQbitScrapedData([]);
            } else {
                setQbitScrapedData(result.data || []);
                setQbitTaskTitles(result.taskTitles);
                toast.success(`Дані Q-Bit для cid=${qbitCid} отримано. Знайдено: ${result.data?.length || 0} записів.`);
            }
        });
    };

    const handleSaveData = async () => {
        if (!qbitScrapedData || qbitScrapedData.length === 0) {
            toast.error("Немає даних для збереження.");
            return;
        }
        if (!qbitTaskTitles || qbitTaskTitles.length === 0) {
             console.warn("Не вдалося визначити заголовки завдань, буде збережено тільки загальний бал.");
        }

        startSavingTransition(async () => {
            const result = await saveQbitDataToDb(
                qbitCid,
                qbitScrapedData,
                qbitTaskTitles || [],
                qbitCourseName || undefined
            );

            if (result.error) {
                toast.error("Помилка збереження даних Q-Bit", { description: result.error });
            } else {
                toast.success(result.message || "Дані Q-Bit успішно збережено!");
                setQbitScrapedData(null);
                setQbitTaskTitles(undefined);
                setQbitCid('');
                setQbitCourseName('');
                if (onImportComplete) {
                    onImportComplete();
                }
            }
        });
    };

    const currentQbitTaskTitles = qbitTaskTitles || qbitScrapedData?.[0]?.taskScores.map(ts => ts.taskIdentifier || '') || [];

    return (
        <div className="space-y-4">
            <div className='space-y-1'>
                <Label htmlFor="qbit-cid">ID Турніру Q-Bit</Label>
                <Input 
                    id="qbit-cid" 
                    value={qbitCid} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setQbitCid(e.target.value)} 
                    placeholder="напр. 101" 
                    disabled={isScraping || isSaving} 
                />
            </div>
            <div className='space-y-1'>
                <Label htmlFor="qbit-course-name">Назва курсу (опціонально)</Label>
                <Input 
                    id="qbit-course-name" 
                    value={qbitCourseName} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setQbitCourseName(e.target.value)} 
                    placeholder="напр. Весняний турнір з програмування" 
                    disabled={isScraping || isSaving} 
                />
            </div>
            <Button onClick={handleFetch} disabled={isScraping || isSaving || !qbitCid} className="w-full">
                {isScraping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Отримати дані з Q-Bit
            </Button>
            {isScraping && <p className='text-sm text-center text-muted-foreground'>Завантаження...</p>}
            
            {qbitScrapedData && !isScraping && (
                 <div className='mt-2 space-y-2'>
                    {qbitScrapedData.length > 0 ? (
                        <>
                            <h4 className="font-medium">Попередній перегляд даних Q-Bit:</h4>
                            <div className="rounded-md border max-h-60 max-w-120 overflow-y-auto">
                                 <Table>
                                     <TableHeader>
                                         <TableRow>
                                             <TableHead className="w-[60px] sticky top-0 left-0 bg-secondary z-10">Місце</TableHead>
                                             <TableHead className="sticky top-0 left-[60px] bg-secondary z-10 min-w-[150px]">Учасник</TableHead>
                                             {currentQbitTaskTitles.map((title, index) => (
                                                 <TableHead key={`qbit-task-header-${index}`} className="text-center min-w-[70px] sticky top-0 bg-secondary z-10">{title || `-`}</TableHead>
                                             ))}
                                             <TableHead className="text-right sticky top-0 right-0 bg-secondary z-10 min-w-[70px]">Усього</TableHead>
                                         </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                         {qbitScrapedData.map((item, studentIndex) => (
                                             <TableRow key={`${item.studentName}-${studentIndex}`}>
                                                 <TableCell className="sticky left-0 bg-background">{item.rank}</TableCell>
                                                 <TableCell className="sticky left-[60px] bg-background">{item.studentName}</TableCell>
                                                 {currentQbitTaskTitles.map((_, taskIndex) => (
                                                     <TableCell key={`qbit-score-${studentIndex}-${taskIndex}`} className="text-center">
                                                         {item.taskScores[taskIndex]?.score || '-'}
                                                     </TableCell>
                                                 ))}
                                                 <TableCell className="text-right sticky right-0 bg-background">{item.totalScore}</TableCell>
                                             </TableRow>
                                         ))}
                                     </TableBody>
                                 </Table>
                            </div>
                            <p className='text-xs text-muted-foreground'>Показано {qbitScrapedData.length} записів.</p>
                            <Button 
                                variant="default" 
                                className='w-full mt-2' 
                                onClick={handleSaveData}
                                disabled={isSaving || isScraping}
                            >
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Імпортувати дані
                            </Button>
                        </>
                    ) : (
                         <p className="text-muted-foreground text-center text-sm mt-2">Дані Q-Bit не знайдено для вказаного cid.</p>
                    )}
                 </div>
            )}
        </div>
    );
}