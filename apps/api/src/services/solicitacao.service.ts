import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { enviarNotificacao } from "./notificacao.service";

/**
 * Marca como "expirado" pedidos que ficaram tempo demais em
 * "aguardando_autonomo" sem nenhum autônomo aceitar. Não há job/cron na
 * aplicação — a checagem roda de forma "preguiçosa" (lazy) sempre que a
 * lista de pedidos é consultada (GET /solicitacoes/me e /disponiveis),
 * suficiente pra manter o status coerente sem precisar de infraestrutura
 * de agendamento nova.
 */
export async function expirarSolicitacoesAntigas(): Promise<void> {
  const limite = new Date(Date.now() - env.SOLICITACAO_EXPIRA_APOS_DIAS * 24 * 60 * 60 * 1000);

  const antigas = await prisma.solicitacao.findMany({
    where: { status: "aguardando_autonomo", criadoEm: { lt: limite } },
    select: { id: true, clienteId: true },
  });

  if (antigas.length === 0) return;

  await prisma.solicitacao.updateMany({
    where: { id: { in: antigas.map((s) => s.id) } },
    data: { status: "expirado" },
  });

  await Promise.all(
    antigas.map((s) =>
      enviarNotificacao({
        usuarioId: s.clienteId,
        tipo: "solicitacao_expirada",
        titulo: "Pedido expirado",
        mensagem: "Nenhum autônomo aceitou seu pedido a tempo. Você pode criar uma nova solicitação.",
      })
    )
  );
}
