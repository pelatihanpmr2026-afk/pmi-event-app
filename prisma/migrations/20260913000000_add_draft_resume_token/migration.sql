-- AlterTable
ALTER TABLE `draft` ADD COLUMN `resumeToken` VARCHAR(191) NULL,
    ADD COLUMN `resumeTokenExpiresAt` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `draft_resumeToken_key` ON `draft`(`resumeToken`);