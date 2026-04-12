CREATE TYPE "NotificationScope" AS ENUM ('GLOBAL', 'ROLE', 'USER');
CREATE TYPE "NotificationType" AS ENUM ('SYSTEM', 'REQUEST', 'DELIVERY', 'RECEIVING', 'SHIPMENT', 'STORE', 'INVENTORY', 'SECURITY');

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "scope" "NotificationScope" NOT NULL DEFAULT 'GLOBAL',
    "link" TEXT,
    "meta" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_role_targets" (
    "notificationId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "notification_role_targets_pkey" PRIMARY KEY ("notificationId","roleId")
);

CREATE TABLE "notification_reads" (
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("notificationId","userId")
);

CREATE INDEX "notifications_scope_createdAt_idx" ON "notifications"("scope", "createdAt");
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");
CREATE INDEX "notification_reads_userId_readAt_idx" ON "notification_reads"("userId", "readAt");

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_role_targets" ADD CONSTRAINT "notification_role_targets_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_role_targets" ADD CONSTRAINT "notification_role_targets_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
