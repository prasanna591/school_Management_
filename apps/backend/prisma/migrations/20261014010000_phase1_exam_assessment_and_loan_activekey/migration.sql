-- Phase 1: exam assessment fields + library active-loan guard
-- AlterTable
ALTER TABLE `BookLoan` ADD COLUMN `activeKey` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Exam` ADD COLUMN `maxMarks` INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN `passingMarks` INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX `BookLoan_activeKey_key` ON `BookLoan`(`activeKey`);
