-- AlterTable
ALTER TABLE "Courier" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Courier_token_key" ON "Courier"("token");

UPDATE "Courier" SET "token" = gen_random_uuid() WHERE "token" IS NULL;
