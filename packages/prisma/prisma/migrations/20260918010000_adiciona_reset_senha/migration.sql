-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "reset_senha_token_hash" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "reset_senha_expira_em" TIMESTAMPTZ(6);
