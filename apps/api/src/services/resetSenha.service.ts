import crypto from "crypto";
import { Resend } from "resend";
import { env } from "../lib/env";

export const RESET_TOKEN_VALIDADE_MS = 30 * 60 * 1000;
export const RESET_TENTATIVAS_MAXIMAS = 5;

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export function hashCodigo(codigo: string): string {
  return crypto.createHash("sha256").update(codigo).digest("hex");
}

export function gerarCodigo(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

interface EnviarCodigoInput {
  destinatario: string;
  codigo: string;
  assunto: string;
  introducao: string;
}

// Usado tanto por "esqueci minha senha" (sem sessão) quanto por "alterar
// senha" (logado, com confirmação por e-mail como segunda etapa) — mesmo
// template, só muda o texto de introdução.
export async function enviarCodigoEmail({ destinatario, codigo, assunto, introducao }: EnviarCodigoInput): Promise<void> {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: destinatario,
      subject: `${assunto} — HelpMate`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #388E3C;">${assunto}</h2>
          <p>${introducao}</p>
          <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; background: #F1F8E9; padding: 16px; border-radius: 8px; text-align: center;">${codigo}</p>
          <p style="color: #666; font-size: 13px;">Esse código expira em 30 minutos. Se você não pediu isso, pode ignorar este e-mail.</p>
        </div>
      `,
    });
  } catch (erroEnvio) {
    console.error(`Falha ao enviar e-mail: ${assunto}`, erroEnvio);
  }
}

export const emailConfigurado = !!resend;
