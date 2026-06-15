-- AlterTable
ALTER TABLE "FranchiseApplication" ADD COLUMN     "branchId" TEXT;

-- AddForeignKey
ALTER TABLE "FranchiseApplication" ADD CONSTRAINT "FranchiseApplication_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
