-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "heroOverlay" DOUBLE PRECISION DEFAULT 0.5,
ADD COLUMN     "heroVideoUrl" TEXT,
ADD COLUMN     "storyImageUrl" TEXT,
ADD COLUMN     "storyText" JSONB,
ADD COLUMN     "storyTitle" JSONB;
