import type { NextFunction, Request, Response } from "express";
import type { JwtPayload, Role } from "@help/shared-types";
import { verifyJwt } from "../lib/jwt";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// O token só prova QUEM é o usuário (assinatura + sub) — os papéis
// (isCliente/isAutonomo/isAdmin) são relidos do banco a cada requisição
// em vez de confiar no que veio gravado no JWT no momento do login. Sem
// isso, um usuário desativado, uma aprovação de autônomo revogada ou uma
// promoção/remoção de admin só valeriam depois do token expirar (até
// JWT_EXPIRES_IN, hoje 7 dias) — a ação continuaria liberada nesse meio
// tempo, mesmo já bloqueada no banco.
export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized", message: "Token não informado" });
  }

  const token = header.slice("Bearer ".length);

  try {
    const decodificado = verifyJwt(token);

    const usuario = await prisma.usuario.findUnique({ where: { id: decodificado.sub } });
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ error: "unauthorized", message: "Token inválido ou expirado" });
    }

    req.user = {
      sub: usuario.id,
      email: usuario.email,
      isCliente: usuario.isCliente,
      isAutonomo: usuario.isAutonomo,
      isAdmin: usuario.isAdmin,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized", message: "Token inválido ou expirado" });
  }
}

const ROLE_CHECKS: Record<Role, (user: JwtPayload) => boolean> = {
  cliente: (user) => user.isCliente,
  autonomo: (user) => user.isAutonomo,
  admin: (user) => user.isAdmin,
};

/** Exige que o usuário autenticado possua ao menos um dos papéis informados. */
export function exigirRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "unauthorized", message: "Token não informado" });
    }

    const permitido = roles.some((role) => ROLE_CHECKS[role](req.user!));

    if (!permitido) {
      return res.status(403).json({ error: "forbidden", message: "Sem permissão para este recurso" });
    }

    return next();
  };
}
