-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
