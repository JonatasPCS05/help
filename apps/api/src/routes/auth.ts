import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { signJwt } from "../lib/jwt";
import { env } from "../lib/env";
import { ApiHttpError } from "../middleware/errorHandler";

export const authRouter = Router();

const googleClient = env.GOOGLE_CLIENT_ID ? new OAuth2Client(env.GOOGLE_CLIENT_ID) : null;

const cpfRegex = /^\d{11}$/;

function toJwtPayload(usuario: {
  id: string;
  email: string;
  isCliente: boolean;
  isAutonomo: boolean;
  isAdmin: boolean;
}) {
  return {
    sub: usuario.id,
    email: usuario.email,
    isCliente: usuario.isCliente,
    isAutonomo: usuario.isAutonomo,
    isAdmin: usuario.isAdmin,
  };
}

const senhaForteRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const registroSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z
    .string()
    .min(8)
    .regex(
      senhaForteRegex,
      "Senha deve ter letra maiúscula, minúscula, número e caractere especial"
    ),
  cpf: z.string().regex(cpfRegex, "CPF deve conter 11 dígitos numéricos"),
  telefone: z.string().optional(),
});

authRouter.post("/registro", async (req, res, next) => {
  try {
    const dados = registroSchema.parse(req.body);

    const existente = await prisma.usuario.findFirst({
      where: { OR: [{ email: dados.email }, { cpf: dados.cpf }] },
    });

    if (existente) {
      throw new ApiHttpError(409, "usuario_existente", "E-mail ou CPF já cadastrado");
    }

    const senhaHash = await bcrypt.hash(dados.senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome: dados.nome,
        email: dados.email,
        senhaHash,
        cpf: dados.cpf,
        telefone: dados.telefone,
      },
    });

    const token = signJwt(toJwtPayload(usuario));
    res.status(201).json({ token, usuario: semSenha(usuario) });
  } catch (error) {
    next(error);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const dados = loginSchema.parse(req.body);

    const usuario = await prisma.usuario.findUnique({ where: { email: dados.email } });

    if (!usuario?.senhaHash || !(await bcrypt.compare(dados.senha, usuario.senhaHash))) {
      throw new ApiHttpError(401, "credenciais_invalidas", "E-mail ou senha inválidos");
    }

    if (!usuario.ativo) {
      throw new ApiHttpError(403, "usuario_inativo", "Conta desativada");
    }

    const token = signJwt(toJwtPayload(usuario));
    res.json({ token, usuario: semSenha(usuario) });
  } catch (error) {
    next(error);
  }
});

const googleLoginSchema = z.object({
  idToken: z.string().min(1),
  cpf: z.string().regex(cpfRegex, "CPF deve conter 11 dígitos numéricos").optional(),
});

authRouter.post("/google", async (req, res, next) => {
  try {
    if (!googleClient) {
      throw new ApiHttpError(500, "google_nao_configurado", "Login com Google não está configurado");
    }

    const { idToken, cpf } = googleLoginSchema.parse(req.body);

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new ApiHttpError(401, "google_token_invalido", "Token do Google inválido");
    }

    if (!payload?.email) {
      throw new ApiHttpError(401, "google_token_invalido", "Token do Google inválido");
    }

    let usuario = await prisma.usuario.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
    });

    if (!usuario) {
      // Cadastro novo via Google: CPF é obrigatório mesmo nesse fluxo.
      if (!cpf) {
        return res.status(422).json({
          error: "cpf_obrigatorio",
          message: "Informe o CPF para concluir o cadastro via Google",
        });
      }

      const cpfEmUso = await prisma.usuario.findUnique({ where: { cpf } });
      if (cpfEmUso) {
        throw new ApiHttpError(409, "cpf_em_uso", "CPF já cadastrado em outra conta");
      }

      usuario = await prisma.usuario.create({
        data: {
          nome: payload.name ?? payload.email.split("@")[0],
          email: payload.email,
          googleId: payload.sub,
          fotoUrl: payload.picture,
          cpf,
        },
      });
    } else if (!usuario.googleId) {
      usuario = await prisma.usuario.update({
        where: { id: usuario.id },
        data: { googleId: payload.sub, fotoUrl: usuario.fotoUrl ?? payload.picture },
      });
    }

    const token = signJwt(toJwtPayload(usuario));
    res.json({ token, usuario: semSenha(usuario) });
  } catch (error) {
    next(error);
  }
});

const RESET_TOKEN_VALIDADE_MS = 30 * 60 * 1000;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const esqueciSenhaSchema = z.object({
  email: z.string().email(),
});

authRouter.post("/esqueci-senha", async (req, res, next) => {
  try {
    const { email } = esqueciSenhaSchema.parse(req.body);
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    // Resposta genérica sempre que possível, pra não vazar quais e-mails
    // têm conta cadastrada.
    const respostaGenerica = {
      message: "Se esse e-mail tiver uma conta, enviaremos instruções de redefinição.",
    };

    if (!usuario) {
      res.json(respostaGenerica);
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        resetSenhaTokenHash: hashToken(token),
        resetSenhaExpiraEm: new Date(Date.now() + RESET_TOKEN_VALIDADE_MS),
      },
    });

    if (env.RESEND_API_KEY) {
      // TODO: enviar e-mail transacional de verdade via Resend com o link
      // `${API_PUBLIC_URL}/resetar-senha?token=${token}`.
      res.json(respostaGenerica);
      return;
    }

    // Sem Resend configurado ainda: devolve o token direto na resposta (só
    // nesse modo) pra a recuperação de senha continuar testável ponta a
    // ponta, no mesmo espírito dos outros provedores externos em modo
    // simulado (Stone, FCM, WhatsApp). Trocar por envio real assim que
    // houver credencial de e-mail — ver RESEND_API_KEY em env.ts.
    res.json({ ...respostaGenerica, devToken: token });
  } catch (error) {
    next(error);
  }
});

const resetarSenhaSchema = z.object({
  token: z.string().min(1),
  novaSenha: z
    .string()
    .min(8)
    .regex(
      senhaForteRegex,
      "Senha deve ter letra maiúscula, minúscula, número e caractere especial"
    ),
});

authRouter.post("/resetar-senha", async (req, res, next) => {
  try {
    const { token, novaSenha } = resetarSenhaSchema.parse(req.body);

    const usuario = await prisma.usuario.findFirst({
      where: { resetSenhaTokenHash: hashToken(token) },
    });

    if (!usuario || !usuario.resetSenhaExpiraEm || usuario.resetSenhaExpiraEm.getTime() < Date.now()) {
      throw new ApiHttpError(400, "token_invalido_ou_expirado", "Token inválido ou expirado. Solicite uma nova redefinição.");
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash, resetSenhaTokenHash: null, resetSenhaExpiraEm: null },
    });

    res.json({ message: "Senha redefinida com sucesso." });
  } catch (error) {
    next(error);
  }
});

function semSenha<T extends { senhaHash?: string | null }>(usuario: T) {
  const { senhaHash, ...resto } = usuario;
  return resto;
}
