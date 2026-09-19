-- CreateEnum
CREATE TYPE "PhotoType" AS ENUM ('BEFORE', 'AFTER');

-- CreateTable
CREATE TABLE "TreatmentPhoto" (
    "id" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "PhotoType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TreatmentPhoto" ADD CONSTRAINT "TreatmentPhoto_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
