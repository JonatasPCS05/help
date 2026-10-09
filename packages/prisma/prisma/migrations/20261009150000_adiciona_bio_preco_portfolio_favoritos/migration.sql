-- AlterTable
ALTER TABLE "perfis_autonomos" ADD COLUMN "bio" TEXT;

-- AlterTable
ALTER TABLE "autonomo_categorias" ADD COLUMN "preco_base" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "perfil_autonomo_fotos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "perfil_autonomo_id" UUID NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "perfil_autonomo_fotos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favoritos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "autonomo_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favoritos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "favoritos_cliente_id_autonomo_id_key" ON "favoritos"("cliente_id", "autonomo_id");

-- AddForeignKey
ALTER TABLE "perfil_autonomo_fotos" ADD CONSTRAINT "perfil_autonomo_fotos_perfil_autonomo_id_fkey" FOREIGN KEY ("perfil_autonomo_id") REFERENCES "perfis_autonomos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favoritos" ADD CONSTRAINT "favoritos_autonomo_id_fkey" FOREIGN KEY ("autonomo_id") REFERENCES "perfis_autonomos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
