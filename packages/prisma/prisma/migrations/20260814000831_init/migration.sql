-- CreateEnum
CREATE TYPE "status_aprovacao" AS ENUM ('pendente', 'aprovado', 'rejeitado');

-- CreateEnum
CREATE TYPE "status_solicitacao" AS ENUM ('aguardando_autonomo', 'aceito_pelo_autonomo', 'recusado_pelo_autonomo', 'visita_agendada', 'orcamento_enviado', 'orcamento_aceito', 'orcamento_recusado', 'pago', 'em_andamento', 'concluido', 'cancelado', 'em_disputa');

-- CreateEnum
CREATE TYPE "status_orcamento" AS ENUM ('pendente', 'aceito', 'recusado');

-- CreateEnum
CREATE TYPE "status_pagamento" AS ENUM ('retido', 'liberado', 'reembolsado', 'cancelado');

-- CreateEnum
CREATE TYPE "status_cancelamento" AS ENUM ('pendente_analise', 'aprovado', 'rejeitado');

-- CreateEnum
CREATE TYPE "canal" AS ENUM ('push', 'email', 'whatsapp');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT,
    "google_id" TEXT,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT,
    "foto_url" TEXT,
    "is_cliente" BOOLEAN NOT NULL DEFAULT true,
    "is_autonomo" BOOLEAN NOT NULL DEFAULT false,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "avaliacao_media_cliente" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "avaliacao_media_autonomo" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enderecos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "rua" TEXT NOT NULL,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "principal" BOOLEAN DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enderecos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis_autonomos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razao_social" TEXT NOT NULL,
    "documento_cnpj_url" TEXT NOT NULL,
    "status_aprovacao" "status_aprovacao" NOT NULL DEFAULT 'pendente',
    "online" BOOLEAN NOT NULL DEFAULT false,
    "latitude_atual" DECIMAL(10,7),
    "longitude_atual" DECIMAL(10,7),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfis_autonomos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autonomo_categorias" (
    "autonomo_id" UUID NOT NULL,
    "categoria_id" UUID NOT NULL,

    CONSTRAINT "autonomo_categorias_pkey" PRIMARY KEY ("autonomo_id","categoria_id")
);

-- CreateTable
CREATE TABLE "solicitacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "autonomo_id" UUID,
    "categoria_id" UUID NOT NULL,
    "endereco_id" UUID NOT NULL,
    "descricao" TEXT NOT NULL,
    "disponibilidade" JSONB NOT NULL,
    "status" "status_solicitacao" NOT NULL DEFAULT 'aguardando_autonomo',
    "concluido_cliente_em" TIMESTAMPTZ(6),
    "concluido_autonomo_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacao_fotos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "solicitacao_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas_tecnicas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "data_hora" TIMESTAMPTZ(6) NOT NULL,
    "observacoes" TEXT,
    "realizada" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitas_tecnicas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,
    "status" "status_orcamento" NOT NULL DEFAULT 'pendente',
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "valor_total" DECIMAL(10,2) NOT NULL,
    "taxa_plataforma_percentual" DECIMAL(4,2) NOT NULL DEFAULT 2.00,
    "taxa_plataforma_valor" DECIMAL(10,2) NOT NULL,
    "valor_autonomo" DECIMAL(10,2) NOT NULL,
    "stone_transaction_id" TEXT,
    "status" "status_pagamento" NOT NULL DEFAULT 'retido',
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "liberado_em" TIMESTAMPTZ(6),

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens_chat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "remetente_id" UUID NOT NULL,
    "mensagem" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avaliacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "avaliador_id" UUID NOT NULL,
    "avaliado_id" UUID NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avaliacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancelamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "solicitado_por" UUID NOT NULL,
    "motivo" TEXT NOT NULL,
    "dentro_do_prazo" BOOLEAN,
    "taxa_aplicada" DECIMAL(10,2),
    "reembolso_total" BOOLEAN NOT NULL DEFAULT false,
    "status" "status_cancelamento" NOT NULL DEFAULT 'pendente_analise',
    "analisado_por_admin_id" UUID,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvido_em" TIMESTAMPTZ(6),

    CONSTRAINT "cancelamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "canal" "canal" NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_autonomo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "cnpj" TEXT NOT NULL,
    "documento_cnpj_url" TEXT NOT NULL,
    "status" "status_aprovacao" NOT NULL DEFAULT 'pendente',
    "analisado_por_admin_id" UUID,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvido_em" TIMESTAMPTZ(6),

    CONSTRAINT "solicitacoes_autonomo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_google_id_key" ON "usuarios"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cpf_key" ON "usuarios"("cpf");

-- CreateIndex
CREATE INDEX "idx_enderecos_usuario" ON "enderecos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nome_key" ON "categorias"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_autonomos_usuario_id_key" ON "perfis_autonomos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_autonomos_cnpj_key" ON "perfis_autonomos"("cnpj");

-- CreateIndex
CREATE INDEX "idx_solicitacoes_cliente" ON "solicitacoes"("cliente_id");

-- CreateIndex
CREATE INDEX "idx_solicitacoes_autonomo" ON "solicitacoes"("autonomo_id");

-- CreateIndex
CREATE INDEX "idx_solicitacoes_status" ON "solicitacoes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "visitas_tecnicas_solicitacao_id_key" ON "visitas_tecnicas"("solicitacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_solicitacao_id_key" ON "pagamentos"("solicitacao_id");

-- CreateIndex
CREATE INDEX "idx_mensagens_solicitacao" ON "mensagens_chat"("solicitacao_id");

-- CreateIndex
CREATE INDEX "idx_avaliacoes_avaliado" ON "avaliacoes"("avaliado_id");

-- CreateIndex
CREATE INDEX "idx_notificacoes_usuario" ON "notificacoes"("usuario_id");

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis_autonomos" ADD CONSTRAINT "perfis_autonomos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autonomo_categorias" ADD CONSTRAINT "autonomo_categorias_autonomo_id_fkey" FOREIGN KEY ("autonomo_id") REFERENCES "perfis_autonomos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autonomo_categorias" ADD CONSTRAINT "autonomo_categorias_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_autonomo_id_fkey" FOREIGN KEY ("autonomo_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_endereco_id_fkey" FOREIGN KEY ("endereco_id") REFERENCES "enderecos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacao_fotos" ADD CONSTRAINT "solicitacao_fotos_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas_tecnicas" ADD CONSTRAINT "visitas_tecnicas_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_chat" ADD CONSTRAINT "mensagens_chat_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens_chat" ADD CONSTRAINT "mensagens_chat_remetente_id_fkey" FOREIGN KEY ("remetente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_avaliador_id_fkey" FOREIGN KEY ("avaliador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avaliacoes" ADD CONSTRAINT "avaliacoes_avaliado_id_fkey" FOREIGN KEY ("avaliado_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancelamentos" ADD CONSTRAINT "cancelamentos_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancelamentos" ADD CONSTRAINT "cancelamentos_solicitado_por_fkey" FOREIGN KEY ("solicitado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancelamentos" ADD CONSTRAINT "cancelamentos_analisado_por_admin_id_fkey" FOREIGN KEY ("analisado_por_admin_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_autonomo" ADD CONSTRAINT "solicitacoes_autonomo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_autonomo" ADD CONSTRAINT "solicitacoes_autonomo_analisado_por_admin_id_fkey" FOREIGN KEY ("analisado_por_admin_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
