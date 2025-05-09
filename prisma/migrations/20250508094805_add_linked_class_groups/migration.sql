-- CreateTable
CREATE TABLE "LinkedClassGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkedClassGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassLink" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "ClassLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassLink_groupId_classId_key" ON "ClassLink"("groupId", "classId");

-- AddForeignKey
ALTER TABLE "LinkedClassGroup" ADD CONSTRAINT "LinkedClassGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLink" ADD CONSTRAINT "ClassLink_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "LinkedClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLink" ADD CONSTRAINT "ClassLink_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
