-- CreateTable
CREATE TABLE "_ProductToReel" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductToReel_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProductToReel_B_index" ON "_ProductToReel"("B");

-- AddForeignKey
ALTER TABLE "_ProductToReel" ADD CONSTRAINT "_ProductToReel_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToReel" ADD CONSTRAINT "_ProductToReel_B_fkey" FOREIGN KEY ("B") REFERENCES "Reel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
