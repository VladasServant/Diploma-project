"use client"

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteClass } from "@/server-actions/classDelete";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

interface ClassCardProps {
  classId: string;
  className?: string;
}

export function ClassCardActions({ classId, className }: ClassCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteClass(classId);
        if (result.error) {
          toast.error("Помилка видалення", { description: result.error });
        } else {
          toast.success("Клас успішно видалено");
          setIsDialogOpen(false);
        }
      } catch (e) {
        toast.error("Помилка видалення", { description: "Не вдалося видалити клас." });
      }
    });
  };

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          <Trash2 className="h-4 w-4 text-destructive" />
          <span className="sr-only">Видалити клас</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ви впевнені?</AlertDialogTitle>
          <AlertDialogDescription>
            Ця дія видалить клас та **всі** пов'язані з ним дані (учнів,
            завдання, оцінки).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Скасувати</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Так, видалити
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}