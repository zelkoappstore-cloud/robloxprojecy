ALTER TABLE "User" ADD COLUMN "founder" BOOLEAN NOT NULL DEFAULT false;
UPDATE "User" SET "founder" = true WHERE "username" = 'm0uz';
