CREATE TYPE "OrderStatus" AS ENUM ('PAID', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED');

ALTER TABLE "User"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "usernameChangedAt" TIMESTAMP(3),
  ADD COLUMN "bio" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "emailNotifs" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowMessages" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ALTER COLUMN "emailVerified" SET DEFAULT false;

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PAID',
  "deliveryNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "link" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuthToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RateLimit" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");
CREATE INDEX "Order_sellerId_idx" ON "Order"("sellerId");
CREATE INDEX "Order_status_deliveredAt_idx" ON "Order"("status", "deliveredAt");
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

ALTER TABLE "Order" ADD CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
