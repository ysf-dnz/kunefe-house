-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "cargoAvailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cargoStock" INTEGER;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "cargoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "freeShippingThreshold" DECIMAL(10,2),
ADD COLUMN     "shippingFee" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "ShopOrder" (
    "id" TEXT NOT NULL,
    "merchantOid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "addressCity" TEXT NOT NULL,
    "addressDistrict" TEXT NOT NULL,
    "addressFull" TEXT NOT NULL,
    "addressPostal" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "shippingFee" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "paytrStatus" TEXT,
    "paidAt" TIMESTAMP(3),
    "trackingNo" TEXT,
    "carrier" TEXT,
    "shippedAt" TIMESTAMP(3),
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOrderItem" (
    "id" TEXT NOT NULL,
    "shopOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "qty" INTEGER NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "ShopOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopOrder_merchantOid_key" ON "ShopOrder"("merchantOid");

-- AddForeignKey
ALTER TABLE "ShopOrder" ADD CONSTRAINT "ShopOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_shopOrderId_fkey" FOREIGN KEY ("shopOrderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
