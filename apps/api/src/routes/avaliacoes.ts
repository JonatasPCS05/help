import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";

export const avaliacoesRouter = Router();

avaliacoesRouter.use(autenticar);

const criarAvaliacaoSchema = z.object({
  solicitacaoId: z.string().uuid(),
  nota: z.number().int().min(1).max(5),
  comentario: z.string().optional(),
});

// Requisito 27-28: avaliação mútua após conclusão + recálculo da nota média.
avaliacoesRouter.post("/", async (req, res, next) => {
  try {
    const dados = criarAvaliacaoSchema.parse(req.body);

    const solicitacao = await prisma.solicitacao.findFirst({
      where: {
        id: dados.solicitacaoId,
        OR: [{ clienteId: req.user!.sub }, { autonomoId: req.user!.sub }],
      },
    });
    if (!solicitacao) throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");
    if (solicitacao.status !== "concluido") {
      throw new ApiHttpError(409, "status_invalido", "Só é possível avaliar após a conclusão do serviço");
    }

    const ehCliente = solicitacao.clienteId === req.user!.sub;
    const avaliadoId = ehCliente ? solicitacao.autonomoId : solicitacao.clienteId;
    if (!avaliadoId) throw new ApiHttpError(409, "avaliado_invalido", "Não há usuário para avaliar");

    const jaAvaliou = await prisma.avaliacao.findFirst({
      where: { solicitacaoId: solicitacao.id, avaliadorId: req.user!.sub },
    });
    if (jaAvaliou) {
      throw new ApiHttpError(409, "ja_avaliado", "Você já avaliou esta solicitação");
    }

    const avaliacao = await prisma.avaliacao.create({
      data: {
        solicitacaoId: solicitacao.id,
        avaliadorId: req.user!.sub,
        avaliadoId,
        nota: dados.nota,
        comentario: dados.comentario,
      },
    });

    await recalcularMedia(avaliadoId, ehCliente ? "autonomo" : "cliente");

    res.status(201).json(avaliacao);
  } catch (error) {
    next(error);
  }
});

avaliacoesRouter.get("/usuario/:usuarioId", async (req, res, next) => {
  try {
    const avaliacoes = await prisma.avaliacao.findMany({
      where: { avaliadoId: req.params.usuarioId },
      orderBy: { criadoEm: "desc" },
    });
    res.json(avaliacoes);
  } catch (error) {
    next(error);
  }
});

async function recalcularMedia(usuarioId: string, papel: "cliente" | "autonomo") {
  const agregada = await prisma.avaliacao.aggregate({
    where: { avaliadoId: usuarioId },
    _avg: { nota: true },
  });

  const media = Number((agregada._avg.nota ?? 0).toFixed(1));

  await prisma.usuario.update({
    where: { id: usuarioId },
    data:
      papel === "cliente" ? { avaliacaoMediaCliente: media } : { avaliacaoMediaAutonomo: media },
  });
}
