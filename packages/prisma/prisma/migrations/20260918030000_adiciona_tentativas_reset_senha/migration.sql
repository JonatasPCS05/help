-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "reset_senha_tentativas" INTEGER NOT NULL DEFAULT 0;
