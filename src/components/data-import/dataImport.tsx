"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { PlusCircle, BookOpen, Code2, ArrowLeft } from "lucide-react";

import { ClassroomImportForm } from "@/components/classroom-import/classroomImport";
import { QbitImportForm } from "@/components/qbit-import/qbitImport";

type ImportSource = null | "google_classroom" | "qbit";

export function DataImporter() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<ImportSource>(null);

  const handleImportSuccess = () => {
    setActiveSource(null);
    setIsDialogOpen(false);
  };

  const handlePlatformSelect = (platform: ImportSource) => {
    setActiveSource(platform);
  };

  const goBackToPlatformChoice = () => {
    setActiveSource(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setActiveSource(null);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
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
                Оберіть платформу, з якої бажаєте імпортувати дані.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <Button
                onClick={() => handlePlatformSelect("google_classroom")}
                variant="outline"
                className="w-full h-28 flex flex-col items-center justify-center text-center p-2"
              >
                <BookOpen className="mb-2 h-8 w-8" /> Google Classroom
              </Button>
              <Button
                onClick={() => handlePlatformSelect("qbit")}
                variant="outline"
                className="w-full h-28 flex flex-col items-center justify-center text-center p-2"
              >
                <Code2 className="mb-2 h-8 w-8" /> Q-Bit
              </Button>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Скасувати
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center space-x-2 relative mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goBackToPlatformChoice}
                  className="absolute left-0 top-0 h-full"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <DialogTitle className="text-center flex-grow pt-1">
                  Імпорт з{" "}
                  {activeSource === "google_classroom"
                    ? "Google Classroom"
                    : "Q-Bit"}
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="py-2 overflow-y-auto flex-grow">
              {activeSource === "google_classroom" && (
                <ClassroomImportForm onImportComplete={handleImportSuccess} />
              )}
              {activeSource === "qbit" && (
                <QbitImportForm onImportComplete={handleImportSuccess} />
              )}
            </div>
            <DialogFooter className="sm:justify-end pt-4 mt-auto">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBackToPlatformChoice}
                >
                  Закрити
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
