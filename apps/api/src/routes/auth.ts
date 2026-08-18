import { Router } from "express";
import bcrypt from "bcryptjs";
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

const registroSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
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

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

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

function semSenha<T extends { senhaHash?: string | null }>(usuario: T) {
  const { senhaHash, ...resto } = usuario;
  return resto;
}
