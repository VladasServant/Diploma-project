/*
  Warnings:

  - A unique constraint covering the columns `[classId,qbitTaskIdentifier]` on the table `Assignment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Assignment_classId_qbitTaskIdentifier_key" ON "Assignment"("classId", "qbitTaskIdentifier");
