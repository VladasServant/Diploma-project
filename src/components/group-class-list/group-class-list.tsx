"use client"

import { useState, useTransition } from 'react';
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ClassCardActions } from "@/components/class-delete/class-delete";
import { createGroupAction } from '@/server-actions/groupClasses';
import { toast } from "sonner";
import { Loader2, Link2 } from 'lucide-react';
import { UserRole } from '@prisma/client';

type ClassWithTeacherName = {
    id: string;
    name: string;
    teacher: { id: string; name: string | null } | null;
};

interface ClassListWithGroupingProps {
    classes: ClassWithTeacherName[];
    currentUserId?: string;
    currentUserRole?: UserRole;
}

export function ClassListWithGrouping({ classes, currentUserId, currentUserRole }: ClassListWithGroupingProps) {
    const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
    const [groupName, setGroupName] = useState('');
    const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleCheckboxChange = (classId: string, checked: boolean | 'indeterminate') => {
        setSelectedClassIds(prev => {
            const newSet = new Set(prev);
            if (checked === true) newSet.add(classId);
            else newSet.delete(classId);
            return newSet;
        });
    };

    const handleCreateGroup = () => {
        if (selectedClassIds.size < 2) return;
        if (!groupName.trim()) {
            toast.error("Будь ласка, введіть назву для об'єднаної групи.");
            return;
        }

        startTransition(async () => {
            const result = await createGroupAction(Array.from(selectedClassIds), groupName);
            if (result.error) {
                toast.error("Помилка створення групи", { description: result.error });
            } else {
                toast.success(`Групу "${result.groupName}" успішно створено!`);
                setSelectedClassIds(new Set());
                setGroupName('');
                setIsGroupDialogOpen(false);
            }
        });
    };

    return (
        <div>
            {selectedClassIds.size >= 2 && (
                 <div className="mb-4 flex justify-end">
                     <AlertDialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
                         <AlertDialogTrigger asChild>
                             <Button variant="default">
                                 <Link2 className="mr-2 h-4 w-4" />
                                 Створити об'єднаний перегляд ({selectedClassIds.size})
                             </Button>
                         </AlertDialogTrigger>
                         <AlertDialogContent>
                             <AlertDialogHeader>
                                 <AlertDialogTitle>Створення об'єднаного перегляду</AlertDialogTitle>
                                 <AlertDialogDescription>
                                     Введіть назву для цієї групи класів. Ви об'єднуєте {selectedClassIds.size} класи.
                                 </AlertDialogDescription>
                             </AlertDialogHeader>
                             <div className="py-4">
                                 <Label htmlFor="group-name">Назва групи</Label>
                                 <Input
                                     id="group-name"
                                     value={groupName}
                                     onChange={(e) => setGroupName(e.target.value)}
                                     placeholder="Напр., Мемознавство + КС 242 рядки"
                                     disabled={isPending}
                                 />
                             </div>
                             <AlertDialogFooter>
                                 <AlertDialogCancel disabled={isPending}>Скасувати</AlertDialogCancel>
                                 <AlertDialogAction onClick={handleCreateGroup} disabled={isPending || !groupName.trim()}>
                                     {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                     Створити групу
                                 </AlertDialogAction>
                             </AlertDialogFooter>
                         </AlertDialogContent>
                     </AlertDialog>
                 </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((classItem) => (
                    <Card key={classItem.id} className="overflow-hidden relative group flex flex-col">
                        <div className="absolute top-1 left-1 z-10">
                             <Checkbox
                                 id={`select-${classItem.id}`}
                                 checked={selectedClassIds.has(classItem.id)}
                                 onCheckedChange={(checked) => handleCheckboxChange(classItem.id, checked)}
                                 aria-label={`Вибрати клас ${classItem.name}`}
                             />
                         </div>
                         {(currentUserId === classItem.teacher?.id || currentUserRole === UserRole.ADMIN) && (
                            <ClassCardActions
                                classId={classItem.id}
                                className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                        )}
                        <CardHeader className="flex-grow">
                            <CardTitle className="flex justify-between items-start pt-6">
                                <div>
                                    <Link href={`/class-page/${classItem.id}`} className="hover:underline">
                                        <h3 className="text-xl">{classItem.name}</h3>
                                    </Link>
                                    <p className="text-sm text-muted-foreground pt-1">
                                        {classItem.teacher?.name || "Не вказано"}
                                    </p>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardFooter className="flex justify-end">
                            <Link href={`/class-page/${classItem.id}`} passHref>
                                <Button variant="outline" size="sm">Переглянути</Button>
                            </Link>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}