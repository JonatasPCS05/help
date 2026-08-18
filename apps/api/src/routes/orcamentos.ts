import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { autenticar, exigirRole } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";
import { enviarNotificacao } from "../services/notificacao.service";

export const orcamentosRouter = Router();

orcamentosRouter.use(autenticar);

const criarOrcamentoSchema = z.object({
  solicitacaoId: z.string().uuid(),
  valor: z.number().positive(),
  descricao: z.string().optional(),
});

// Requisito 16: autônomo registra orçamento após a visita técnica.
orcamentosRouter.post("/", exigirRole("autonomo"), async (req, res, next) => {
  try {
    const dados = criarOrcamentoSchema.parse(req.body);

    const solicitacao = await prisma.solicitacao.findFirst({
      where: { id: dados.solicitacaoId, autonomoId: req.user!.sub },
    });
    if (!solicitacao) {
      throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");
    }
    if (solicitacao.status !== "visita_agendada") {
      throw new ApiHttpError(409, "status_invalido", "Solicitação precisa ter visita técnica agendada");
    }

    const orcamento = await prisma.orcamento.create({
      data: {
        solicitacaoId: solicitacao.id,
        valor: dados.valor,
        descricao: dados.descricao,
      },
    });

    await prisma.solicitacao.update({
      where: { id: solicitacao.id },
      data: { status: "orcamento_enviado" },
    });

    // Requisito 18: notificar o cliente quando o orçamento for enviado.
    await enviarNotificacao({
      usuarioId: solicitacao.clienteId,
      tipo: "orcamento_enviado",
      titulo: "Orçamento recebido",
      mensagem: `Você recebeu um orçamento de R$ ${dados.valor.toFixed(2)} para sua solicitação.`,
    });

    res.status(201).json(orcamento);
  } catch (error) {
    next(error);
  }
});

const respostaSchema = z.object({ aceitar: z.boolean() });

// Requisito 17: cliente aceita ou recusa o orçamento.
orcamentosRouter.post("/:id/resposta", exigirRole("cliente"), async (req, res, next) => {
  try {
    const { aceitar } = respostaSchema.parse(req.body);

    const orcamento = await prisma.orcamento.findUnique({
      where: { id: req.params.id },
      include: { solicitacao: true },
    });
    if (!orcamento || orcamento.solicitacao.clienteId !== req.user!.sub) {
      throw new ApiHttpError(404, "nao_encontrado", "Orçamento não encontrado");
    }
    if (orcamento.status !== "pendente") {
      throw new ApiHttpError(409, "status_invalido", "Orçamento já foi respondido");
    }

    const atualizado = await prisma.orcamento.update({
      where: { id: orcamento.id },
      data: { status: aceitar ? "aceito" : "recusado" },
    });

    await prisma.solicitacao.update({
      where: { id: orcamento.solicitacaoId },
      data: { status: aceitar ? "orcamento_aceito" : "orcamento_recusado" },
    });

    if (orcamento.solicitacao.autonomoId) {
      await enviarNotificacao({
        usuarioId: orcamento.solicitacao.autonomoId,
        tipo: aceitar ? "orcamento_aceito" : "orcamento_recusado",
        titulo: aceitar ? "Orçamento aceito" : "Orçamento recusado",
        mensagem: aceitar
          ? "O cliente aceitou o orçamento. Prossiga para o pagamento."
          : "O cliente recusou o orçamento enviado.",
      });
    }

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

orcamentosRouter.get("/solicitacao/:solicitacaoId", async (req, res, next) => {
  try {
    const orcamentos = await prisma.orcamento.findMany({
      where: {
        solicitacaoId: req.params.solicitacaoId,
        solicitacao: { OR: [{ clienteId: req.user!.sub }, { autonomoId: req.user!.sub }] },
      },
      orderBy: { criadoEm: "desc" },
    });
    res.json(orcamentos);
  } catch (error) {
    next(error);
  }
});
