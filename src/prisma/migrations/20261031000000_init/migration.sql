CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'DELETED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Wallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "zeltokenBalance" INTEGER NOT NULL DEFAULT 500,
  CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Listing" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priceInZeltokens" INTEGER NOT NULL,
  "sellerId" TEXT NOT NULL,
  "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL,
  "buyerWalletId" TEXT NOT NULL,
  "sellerWalletId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");
CREATE INDEX "Listing_status_idx" ON "Listing"("status");
CREATE INDEX "Message_senderId_receiverId_sentAt_idx" ON "Message"("senderId", "receiverId", "sentAt");

ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_buyerWalletId_fkey" FOREIGN KEY ("buyerWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sellerWalletId_fkey" FOREIGN KEY ("sellerWalletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
