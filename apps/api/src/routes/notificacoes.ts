import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";

export const notificacoesRouter = Router();

notificacoesRouter.use(autenticar);

notificacoesRouter.get("/", async (req, res, next) => {
  try {
    const apenasNaoLidas = req.query.naoLidas === "true";

    const notificacoes = await prisma.notificacao.findMany({
      where: { usuarioId: req.user!.sub, ...(apenasNaoLidas ? { lida: false } : {}) },
      orderBy: { criadoEm: "desc" },
      take: 100,
    });

    res.json(notificacoes);
  } catch (error) {
    next(error);
  }
});

notificacoesRouter.patch("/:id/lida", async (req, res, next) => {
  try {
    const notificacao = await prisma.notificacao.findFirst({
      where: { id: req.params.id, usuarioId: req.user!.sub },
    });
    if (!notificacao) throw new ApiHttpError(404, "nao_encontrada", "Notificação não encontrada");

    const atualizada = await prisma.notificacao.update({
      where: { id: notificacao.id },
      data: { lida: true },
    });

    res.json(atualizada);
  } catch (error) {
    next(error);
  }
});

notificacoesRouter.post("/marcar-todas-lidas", async (req, res, next) => {
  try {
    await prisma.notificacao.updateMany({
      where: { usuarioId: req.user!.sub, lida: false },
      data: { lida: true },
    });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
