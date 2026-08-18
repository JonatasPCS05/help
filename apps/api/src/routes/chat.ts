import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";
import { enviarNotificacao } from "../services/notificacao.service";

export const chatRouter = Router();

chatRouter.use(autenticar);

// Requisito 26: troca de mensagens entre Cliente e Autônomo vinculada a uma solicitação.
chatRouter.get("/:solicitacaoId/mensagens", async (req, res, next) => {
  try {
    await buscarSolicitacaoDoUsuario(req.params.solicitacaoId, req.user!.sub);

    const mensagens = await prisma.mensagemChat.findMany({
      where: { solicitacaoId: req.params.solicitacaoId },
      orderBy: { criadoEm: "asc" },
    });

    res.json(mensagens);
  } catch (error) {
    next(error);
  }
});

const enviarMensagemSchema = z.object({ mensagem: z.string().min(1) });

chatRouter.post("/:solicitacaoId/mensagens", async (req, res, next) => {
  try {
    const solicitacao = await buscarSolicitacaoDoUsuario(req.params.solicitacaoId, req.user!.sub);
    const { mensagem } = enviarMensagemSchema.parse(req.body);

    const registrada = await prisma.mensagemChat.create({
      data: {
        solicitacaoId: solicitacao.id,
        remetenteId: req.user!.sub,
        mensagem,
      },
    });

    const destinatarioId =
      solicitacao.clienteId === req.user!.sub ? solicitacao.autonomoId : solicitacao.clienteId;

    if (destinatarioId) {
      await enviarNotificacao({
        usuarioId: destinatarioId,
        tipo: "nova_mensagem",
        titulo: "Nova mensagem",
        mensagem: mensagem.slice(0, 80),
      });
    }

    res.status(201).json(registrada);
  } catch (error) {
    next(error);
  }
});

async function buscarSolicitacaoDoUsuario(id: string, usuarioId: string) {
  const solicitacao = await prisma.solicitacao.findFirst({
    where: { id, OR: [{ clienteId: usuarioId }, { autonomoId: usuarioId }] },
  });
  if (!solicitacao) throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");
  return solicitacao;
}
