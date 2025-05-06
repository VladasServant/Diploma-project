"use client";

import { useState, useTransition, ChangeEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { scrapeQBitStandings, QBitResults, QBitScoreResults } from '@/server-actions/qbitActions';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

export function QBitImporter() {
    const [cid, setCid] = useState('');
    const [taskTitles, setTaskTitles] = useState<string[] | undefined>(undefined);
    const [scrapedData, setScrapedData] = useState<QBitResults[] | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleScrape = () => {
        setScrapedData(null);
        setTaskTitles(undefined);

        startTransition(async () => {
            const result = await scrapeQBitStandings(cid);
            if (result.error) {
                toast.error("Помилка отримання даних з Q-bit", { description: result.error });
                setScrapedData([]);
            } else {
                setScrapedData(result.data || []);
                setTaskTitles(result.taskTitles);
                toast.success(`Дані з Q-bit для cid=${cid} отримано! Знайдено ${result.data?.length || 0} записів.`);
            }
        });
    };

    const currentTaskTitles = taskTitles && taskTitles.length > 0
        ? taskTitles
        : scrapedData?.[0]?.taskScore.map(ts => ts.taskTitle || '') || [];

    return (
         <div className="p-4 border rounded-md space-y-4">
            <h3 className="text-lg font-semibold">Імпорт з Q-bit (Standings)</h3>
             <div className='space-y-2'>
                <Label htmlFor="qbit-cid">ID Курсу/Турніру Q-bit (cid)</Label>
                <Input
                    id="qbit-cid"
                    value={cid}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCid(e.target.value)}
                    placeholder="Введіть cid, наприклад 101 або 2231"
                    disabled={isPending}
                />
            </div>
             <Button onClick={handleScrape} disabled={isPending || !cid}>
                 {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                 Завантажити Standings
             </Button>

            {scrapedData !== null && (
                <div className='mt-4'>
                    <h4 className="font-medium mb-2">Отримані дані:</h4>
                    {scrapedData.length === 0 && !isPending ? (
                        <p className="text-muted-foreground">Дані не знайдено або сталася помилка.</p>
                    ) : scrapedData.length > 0 && (
                        <div className="rounded-md border max-h-[400px] overflow-y-auto">
                             <Table>
                                 <TableHeader>
                                     <TableRow>
                                         <TableHead className="w-[60px] sticky left-0 bg-background z-10">Місце</TableHead>
                                         <TableHead className="sticky left-[60px] bg-background z-10 min-w-[200px]">Учасник</TableHead>
                                         {currentTaskTitles.map((title, index) => (
                                             <TableHead key={`task-header-${title}-${index}`} className="text-center min-w-[80px]">{title}</TableHead>
                                         ))}
                                         <TableHead className="text-right sticky right-0 bg-background z-10 min-w-[80px]">Усього</TableHead>
                                     </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                     {scrapedData.map((item, studentIndex) => (
                                         <TableRow key={`${item.studentName}-${studentIndex}`}>
                                             <TableCell className="sticky left-0 bg-background z-0">{item.rank}</TableCell>
                                             <TableCell className="sticky left-[60px] bg-background z-0">{item.studentName}</TableCell>
                                             {currentTaskTitles.map((_, taskIndex) => (
                                                 <TableCell key={`score-${studentIndex}-${taskIndex}`} className="text-center">
                                                     {item.taskScore[taskIndex]?.score || '-'}
                                                 </TableCell>
                                             ))}
                                             <TableCell className="text-right sticky right-0 bg-background z-0">{item.totalScore}</TableCell>
                                         </TableRow>
                                     ))}
                                 </TableBody>
                             </Table>
                        </div>
                    )}
                    {scrapedData.length > 0 && (
                        <p className='text-xs text-muted-foreground mt-2'>
                            Показано {scrapedData.length} записів.
                        </p>
                    )}
                 </div>
             )}
        </div>
    );
}
