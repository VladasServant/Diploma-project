/*
  Warnings:

  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[qbitCid]` on the table `Class` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "qbitTaskIdentifier" TEXT;

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "qbitCid" TEXT,
ADD COLUMN     "sourcePlatform" TEXT;

-- DropTable
DROP TABLE "Notification";

-- CreateIndex
CREATE UNIQUE INDEX "Class_qbitCid_key" ON "Class"("qbitCid");
