import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";
import { enviarNotificacao } from "../services/notificacao.service";
import { reembolsarPagamentoDaSolicitacao } from "../services/pagamento.service";

export const cancelamentosRouter = Router();

cancelamentosRouter.use(autenticar);

const PRAZO_MINIMO_DIAS = 2;
const TAXA_CANCELAMENTO_FORA_DO_PRAZO_PERCENTUAL = 10;

function dataReferencia(solicitacao: {
  disponibilidade: unknown;
}): Date | null {
  const disponibilidade = solicitacao.disponibilidade as { dia: string }[] | null;
  if (!disponibilidade?.length) return null;
  const dias = disponibilidade.map((item) => new Date(item.dia).getTime()).filter((t) => !Number.isNaN(t));
  if (!dias.length) return null;
  return new Date(Math.min(...dias));
}

const criarCancelamentoSchema = z.object({
  solicitacaoId: z.string().uuid(),
  motivo: z.string().min(3),
});

// Requisitos 29-31: cancelamento com/sem multa conforme antecedência, bloqueado durante execução.
cancelamentosRouter.post("/", async (req, res, next) => {
  try {
    const dados = criarCancelamentoSchema.parse(req.body);

    const solicitacao = await prisma.solicitacao.findFirst({
      where: {
        id: dados.solicitacaoId,
        OR: [{ clienteId: req.user!.sub }, { autonomoId: req.user!.sub }],
      },
      include: { visitaTecnica: true, orcamentos: { where: { status: "aceito" } } },
    });
    if (!solicitacao) throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");

    if (solicitacao.status === "em_andamento") {
      throw new ApiHttpError(409, "cancelamento_bloqueado", "Não é possível cancelar durante a execução do serviço");
    }
    if (solicitacao.status === "concluido" || solicitacao.status === "cancelado") {
      throw new ApiHttpError(409, "status_invalido", "Solicitação já foi finalizada");
    }

    const referencia = solicitacao.visitaTecnica?.dataHora ?? dataReferencia(solicitacao);
    const diasDeAntecedencia = referencia
      ? (referencia.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      : PRAZO_MINIMO_DIAS; // sem data de referência: trata como dentro do prazo

    const dentroDoPrazo = diasDeAntecedencia >= PRAZO_MINIMO_DIAS;
    const orcamento = solicitacao.orcamentos[0];
    const taxaAplicada =
      !dentroDoPrazo && orcamento
        ? Number((Number(orcamento.valor) * (TAXA_CANCELAMENTO_FORA_DO_PRAZO_PERCENTUAL / 100)).toFixed(2))
        : 0;

    const cancelamento = await prisma.cancelamento.create({
      data: {
        solicitacaoId: solicitacao.id,
        solicitadoPor: req.user!.sub,
        motivo: dados.motivo,
        dentroDoPrazo,
        taxaAplicada,
        reembolsoTotal: dentroDoPrazo,
        status: "aprovado",
        resolvidoEm: new Date(),
      },
    });

    await prisma.solicitacao.update({ where: { id: solicitacao.id }, data: { status: "cancelado" } });
    await reembolsarPagamentoDaSolicitacao(solicitacao.id);

    await Promise.all(
      [solicitacao.clienteId, solicitacao.autonomoId].filter(Boolean).map((usuarioId) =>
        enviarNotificacao({
          usuarioId: usuarioId as string,
          tipo: "solicitacao_cancelada",
          titulo: "Solicitação cancelada",
          mensagem: dentroDoPrazo
            ? "A solicitação foi cancelada sem multa."
            : `A solicitação foi cancelada fora do prazo. Taxa aplicada: R$ ${taxaAplicada.toFixed(2)}.`,
        })
      )
    );

    res.status(201).json(cancelamento);
  } catch (error) {
    next(error);
  }
});

const naoCompareceuSchema = z.object({
  solicitacaoId: z.string().uuid(),
  motivo: z.string().min(3),
});

// Requisitos 32-33: não comparecimento do autônomo -> reembolso total e disputa para o Admin.
cancelamentosRouter.post("/nao-compareceu", async (req, res, next) => {
  try {
    const dados = naoCompareceuSchema.parse(req.body);

    const solicitacao = await prisma.solicitacao.findFirst({
      where: { id: dados.solicitacaoId, clienteId: req.user!.sub },
    });
    if (!solicitacao) throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");

    const cancelamento = await prisma.cancelamento.create({
      data: {
        solicitacaoId: solicitacao.id,
        solicitadoPor: req.user!.sub,
        motivo: dados.motivo,
        reembolsoTotal: true,
        status: "pendente_analise",
      },
    });

    await prisma.solicitacao.update({ where: { id: solicitacao.id }, data: { status: "em_disputa" } });

    const admins = await prisma.usuario.findMany({ where: { isAdmin: true } });
    await Promise.all(
      admins.map((admin) =>
        enviarNotificacao({
          usuarioId: admin.id,
          tipo: "disputa_aberta",
          titulo: "Nova disputa: não comparecimento",
          mensagem: `Cliente reportou não comparecimento do autônomo na solicitação ${solicitacao.id}.`,
        })
      )
    );

    res.status(201).json(cancelamento);
  } catch (error) {
    next(error);
  }
});

cancelamentosRouter.get("/me", async (req, res, next) => {
  try {
    const cancelamentos = await prisma.cancelamento.findMany({
      where: { solicitadoPor: req.user!.sub },
      orderBy: { criadoEm: "desc" },
    });
    res.json(cancelamentos);
  } catch (error) {
    next(error);
  }
});
