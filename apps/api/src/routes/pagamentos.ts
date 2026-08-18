import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { autenticar, exigirRole } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";
import { env } from "../lib/env";
import { criarCobrancaRetida } from "../services/stone.service";
import { enviarNotificacao } from "../services/notificacao.service";

export const pagamentosRouter = Router();

pagamentosRouter.use(autenticar);

const criarPagamentoSchema = z.object({ solicitacaoId: z.string().uuid() });

// Requisitos 19-21: inicia cobrança na Stone, retém o valor e calcula a taxa da plataforma.
pagamentosRouter.post("/", exigirRole("cliente"), async (req, res, next) => {
  try {
    const { solicitacaoId } = criarPagamentoSchema.parse(req.body);

    const solicitacao = await prisma.solicitacao.findFirst({
      where: { id: solicitacaoId, clienteId: req.user!.sub },
      include: { orcamentos: { where: { status: "aceito" } } },
    });
    if (!solicitacao) throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");
    if (solicitacao.status !== "orcamento_aceito") {
      throw new ApiHttpError(409, "status_invalido", "Solicitação não possui orçamento aceito");
    }

    const orcamento = solicitacao.orcamentos[0];
    if (!orcamento) {
      throw new ApiHttpError(409, "orcamento_nao_encontrado", "Nenhum orçamento aceito encontrado");
    }

    const existente = await prisma.pagamento.findUnique({ where: { solicitacaoId } });
    if (existente) {
      return res.json(existente);
    }

    const valorTotal = Number(orcamento.valor);
    const taxaPercentual = env.PLATAFORMA_TAXA_PERCENTUAL;
    const taxaValor = Number((valorTotal * (taxaPercentual / 100)).toFixed(2));
    const valorAutonomo = Number((valorTotal - taxaValor).toFixed(2));

    const cobranca = await criarCobrancaRetida({
      solicitacaoId,
      valorTotal,
      descricao: solicitacao.descricao,
    });

    const pagamento = await prisma.pagamento.create({
      data: {
        solicitacaoId,
        valorTotal,
        taxaPlataformaPercentual: taxaPercentual,
        taxaPlataformaValor: taxaValor,
        valorAutonomo,
        stoneTransactionId: cobranca.transactionId,
        status: "retido",
      },
    });

    await prisma.solicitacao.update({ where: { id: solicitacaoId }, data: { status: "pago" } });

    // Requisito 23: notificar cliente e autônomo sobre status de pagamento.
    await Promise.all(
      [solicitacao.clienteId, solicitacao.autonomoId].filter(Boolean).map((usuarioId) =>
        enviarNotificacao({
          usuarioId: usuarioId as string,
          tipo: "pagamento_retido",
          titulo: "Pagamento confirmado",
          mensagem: `O pagamento de R$ ${valorTotal.toFixed(2)} foi confirmado e está retido até a conclusão do serviço.`,
        })
      )
    );

    res.status(201).json(pagamento);
  } catch (error) {
    next(error);
  }
});

pagamentosRouter.get("/solicitacao/:solicitacaoId", async (req, res, next) => {
  try {
    const pagamento = await prisma.pagamento.findFirst({
      where: {
        solicitacaoId: req.params.solicitacaoId,
        solicitacao: { OR: [{ clienteId: req.user!.sub }, { autonomoId: req.user!.sub }] },
      },
    });
    if (!pagamento) throw new ApiHttpError(404, "nao_encontrado", "Pagamento não encontrado");
    res.json(pagamento);
  } catch (error) {
    next(error);
  }
});
