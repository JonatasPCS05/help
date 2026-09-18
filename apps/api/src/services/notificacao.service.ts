import { Resend } from "resend";
import type { Canal } from "@help/shared-types";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

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
  if (!resend) return;
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) return;

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: usuario.email,
      subject: `${titulo} — HelpMate`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #388E3C;">${titulo}</h2>
          <p>${mensagem}</p>
        </div>
      `,
    });
  } catch (erro) {
    console.error("Falha ao enviar e-mail de notificação", erro);
  }
}

async function enviarWhatsapp(usuarioId: string, mensagem: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario?.telefone) return;

  // TODO: integrar com WhatsApp Business API (env.WHATSAPP_API_URL).
  void mensagem;
}
