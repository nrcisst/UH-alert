-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifyToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "catalogNbr" TEXT NOT NULL,
    "title" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassCache" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "catalogNbr" TEXT NOT NULL,
    "courseTitle" TEXT,
    "instructorName" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "seatsAvailable" INTEGER NOT NULL DEFAULT 0,
    "enrollmentCap" INTEGER NOT NULL DEFAULT 0,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOpenedAt" TIMESTAMP(3),

    CONSTRAINT "ClassCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "catalogNbr" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Subscription_subject_catalogNbr_idx" ON "Subscription"("subject", "catalogNbr");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_subject_catalogNbr_key" ON "Subscription"("userId", "subject", "catalogNbr");

-- CreateIndex
CREATE INDEX "ClassCache_isOpen_idx" ON "ClassCache"("isOpen");

-- CreateIndex
CREATE UNIQUE INDEX "ClassCache_subject_catalogNbr_key" ON "ClassCache"("subject", "catalogNbr");

-- CreateIndex
CREATE INDEX "AlertLog_userId_subject_catalogNbr_sentAt_idx" ON "AlertLog"("userId", "subject", "catalogNbr", "sentAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertLog" ADD CONSTRAINT "AlertLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
