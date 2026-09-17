import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";
import { enviarNotificacao } from "../services/notificacao.service";

export const chatRouter = Router();

chatRouter.use(autenticar);

// Lista as solicitações do usuário que já têm autônomo definido (a partir
// daí as duas partes podem conversar), com a última mensagem pra preview.
chatRouter.get("/conversas", async (req, res, next) => {
  try {
    const solicitacoes = await prisma.solicitacao.findMany({
      where: {
        autonomoId: { not: null },
        OR: [{ clienteId: req.user!.sub }, { autonomoId: req.user!.sub }],
      },
      include: {
        categoria: true,
        cliente: { select: { id: true, nome: true } },
        autonomo: { select: { id: true, nome: true } },
        mensagens: { orderBy: { criadoEm: "desc" }, take: 1 },
      },
    });

    const conversas = solicitacoes
      .map((s) => ({
        solicitacaoId: s.id,
        categoria: s.categoria.nome,
        status: s.status,
        outraParte: s.clienteId === req.user!.sub ? s.autonomo : s.cliente,
        ultimaMensagem: s.mensagens[0]?.mensagem ?? null,
        ultimaMensagemEm: s.mensagens[0]?.criadoEm ?? s.criadoEm,
        ultimaMensagemDe: s.mensagens[0]?.remetenteId ?? null,
      }))
      .sort((a, b) => new Date(b.ultimaMensagemEm).getTime() - new Date(a.ultimaMensagemEm).getTime());

    res.json(conversas);
  } catch (error) {
    next(error);
  }
});

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
