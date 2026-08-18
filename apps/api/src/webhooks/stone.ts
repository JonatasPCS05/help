import { Router } from "express";
import { validarAssinaturaWebhook } from "../services/stone.service";
import { prisma } from "../lib/prisma";
import { enviarNotificacao } from "../services/notificacao.service";

export const stoneWebhookRouter = Router();

interface StoneWebhookPayload {
  transaction_id: string;
  status: "confirmed" | "failed" | "refunded";
}

// Webhook de confirmação de pagamento da Stone (requisitos 19-23).
stoneWebhookRouter.post("/stone", async (req, res, next) => {
  try {
    const assinatura = req.headers["x-stone-signature"] as string | undefined;
    if (!validarAssinaturaWebhook(req.body, assinatura)) {
      return res.status(401).json({ error: "assinatura_invalida", message: "Assinatura do webhook inválida" });
    }

    const payload = req.body as StoneWebhookPayload;

    const pagamento = await prisma.pagamento.findFirst({
      where: { stoneTransactionId: payload.transaction_id },
    });

    if (!pagamento) {
      // Responde 200 para evitar retentativas indevidas de eventos não reconhecidos.
      return res.status(200).json({ ok: true, ignorado: true });
    }

    if (payload.status === "confirmed" && pagamento.status === "retido") {
      // Cobrança confirmada pela Stone: mantém retido até a conclusão mútua do serviço.
      const solicitacao = await prisma.solicitacao.findUnique({ where: { id: pagamento.solicitacaoId } });
      if (solicitacao) {
        await enviarNotificacao({
          usuarioId: solicitacao.clienteId,
          tipo: "pagamento_confirmado",
          titulo: "Pagamento confirmado pela Stone",
          mensagem: "Seu pagamento foi confirmado e está retido até a conclusão do serviço.",
        });
      }
    } else if (payload.status === "failed") {
      await prisma.pagamento.update({ where: { id: pagamento.id }, data: { status: "cancelado" } });
    } else if (payload.status === "refunded") {
      await prisma.pagamento.update({ where: { id: pagamento.id }, data: { status: "reembolsado" } });
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
});
