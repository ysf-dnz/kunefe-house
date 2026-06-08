-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "mapDescription" JSONB,
ADD COLUMN     "mapImageUrl" TEXT,
ADD COLUMN     "mapTitle" JSONB;
