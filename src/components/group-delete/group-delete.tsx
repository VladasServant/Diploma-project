"use client";

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
import { deleteLinkedGroupAction } from '@/server-actions/groupClasses';
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteGroupButtonProps {
  groupId: string;
  className?: string;
}

export function DeleteGroupButton({ groupId, className }: DeleteGroupButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteLinkedGroupAction(groupId);
        if (result.error) {
          toast.error("Помилка видалення групи", { description: result.error });
        } else {
          toast.success("Групу класів успішно видалено.");
          setIsDialogOpen(false);
        }
      } catch (e) {
        toast.error("Помилка видалення", { description: "Не вдалося видалити групу класів." });
      }
    });
  };

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className={className}>
          <Trash2 className="h-4 w-4 text-destructive" />
          <span className="sr-only">Видалити групу</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ви впевнені, що хочете видалити цю групу?</AlertDialogTitle>
          <AlertDialogDescription>
            Ця дія видалить лише зв'язок між класами. Самі класи та їхні дані залишаться.
            Цю дію неможливо буде скасувати.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Скасувати</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Так, видалити групу
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}