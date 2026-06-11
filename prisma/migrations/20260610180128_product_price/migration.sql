-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "oldPrice" DECIMAL(10,2),
ADD COLUMN     "price" DECIMAL(10,2),
ADD COLUMN     "showPrice" BOOLEAN NOT NULL DEFAULT false;
