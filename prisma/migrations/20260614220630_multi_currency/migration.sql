-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'TRY';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "oldPriceQar" DECIMAL(10,2),
ADD COLUMN     "oldPriceUsd" DECIMAL(10,2),
ADD COLUMN     "priceQar" DECIMAL(10,2),
ADD COLUMN     "priceUsd" DECIMAL(10,2);
