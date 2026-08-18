import type { Canal } from "@help/shared-types";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";

interface EnviarNotificacaoInput {
  usuarioId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
}

/**
 * Registra a notificação no banco e dispara para os canais configurados
 * (push via FCM, e-mail via Resend, WhatsApp Business API).
 * Os provedores externos são best-effort: falha de envio não deve
 * impedir a criação do registro de notificação.
 */
export async function enviarNotificacao({
  usuarioId,
  tipo,
  titulo,
  mensagem,
}: EnviarNotificacaoInput): Promise<void> {
  const canais: Canal[] = ["push", "email"];

  if (env.WHATSAPP_API_TOKEN) {
    canais.push("whatsapp");
  }

  await prisma.notificacao.createMany({
    data: canais.map((canal) => ({ usuarioId, tipo, titulo, mensagem, canal })),
  });

  await Promise.allSettled([
    enviarPush(usuarioId, titulo, mensagem),
    enviarEmail(usuarioId, titulo, mensagem),
    env.WHATSAPP_API_TOKEN ? enviarWhatsapp(usuarioId, mensagem) : Promise.resolve(),
  ]);
}

async function enviarPush(usuarioId: string, titulo: string, mensagem: string) {
  if (!env.FCM_PROJECT_ID) return;
  // TODO: integrar com Firebase Cloud Messaging (Admin SDK) usando o token
  // de dispositivo associado ao usuário.
  void usuarioId;
  void titulo;
  void mensagem;
}

async function enviarEmail(usuarioId: string, titulo: string, mensagem: string) {
  if (!env.RESEND_API_KEY) return;
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) return;

  // TODO: integrar com Resend (ou SES) para envio transacional real.
  void titulo;
  void mensagem;
}

async function enviarWhatsapp(usuarioId: string, mensagem: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario?.telefone) return;

  // TODO: integrar com WhatsApp Business API (env.WHATSAPP_API_URL).
  void mensagem;
}
