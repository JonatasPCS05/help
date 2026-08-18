-- CreateTable
CREATE TABLE "solicitacao_recusas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "autonomo_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacao_recusas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solicitacao_recusas_solicitacao_id_autonomo_id_key" ON "solicitacao_recusas"("solicitacao_id", "autonomo_id");

-- AddForeignKey
ALTER TABLE "solicitacao_recusas" ADD CONSTRAINT "solicitacao_recusas_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_recusas" ADD CONSTRAINT "solicitacao_recusas_autonomo_id_fkey" FOREIGN KEY ("autonomo_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
