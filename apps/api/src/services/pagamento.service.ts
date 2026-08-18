import { prisma } from "../lib/prisma";
import { liberarValorAutonomo, reembolsarCliente } from "./stone.service";
import { enviarNotificacao } from "./notificacao.service";

// Requisito 22: libera o valor (descontada a taxa) ao autônomo após
// confirmação de conclusão por ambas as partes.
export async function liberarPagamentoDaSolicitacao(solicitacaoId: string): Promise<void> {
  const pagamento = await prisma.pagamento.findUnique({ where: { solicitacaoId } });
  if (!pagamento || pagamento.status !== "retido") return;

  if (pagamento.stoneTransactionId) {
    await liberarValorAutonomo(pagamento.stoneTransactionId);
  }

  const atualizado = await prisma.pagamento.update({
    where: { id: pagamento.id },
    data: { status: "liberado", liberadoEm: new Date() },
  });

  const solicitacao = await prisma.solicitacao.findUnique({ where: { id: solicitacaoId } });
  if (solicitacao?.autonomoId) {
    await enviarNotificacao({
      usuarioId: solicitacao.autonomoId,
      tipo: "pagamento_liberado",
      titulo: "Pagamento liberado",
      mensagem: `O valor de R$ ${Number(atualizado.valorAutonomo).toFixed(2)} foi liberado para você.`,
    });
  }
}

// Requisito 32: reembolso total ao cliente (ex.: não comparecimento do autônomo).
export async function reembolsarPagamentoDaSolicitacao(solicitacaoId: string): Promise<void> {
  const pagamento = await prisma.pagamento.findUnique({ where: { solicitacaoId } });
  if (!pagamento || pagamento.status !== "retido") return;

  if (pagamento.stoneTransactionId) {
    await reembolsarCliente(pagamento.stoneTransactionId);
  }

  await prisma.pagamento.update({
    where: { id: pagamento.id },
    data: { status: "reembolsado" },
  });

  const solicitacao = await prisma.solicitacao.findUnique({ where: { id: solicitacaoId } });
  if (solicitacao) {
    await enviarNotificacao({
      usuarioId: solicitacao.clienteId,
      tipo: "pagamento_reembolsado",
      titulo: "Pagamento reembolsado",
      mensagem: "O valor pago foi reembolsado integralmente.",
    });
  }
}
