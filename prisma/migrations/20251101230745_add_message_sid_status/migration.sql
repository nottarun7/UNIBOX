-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "messageSid" TEXT,
ADD COLUMN     "status" "MessageStatus" NOT NULL DEFAULT 'PENDING';
