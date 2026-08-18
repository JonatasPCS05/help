import type { NextFunction, Request, Response } from "express";
import type { JwtPayload, Role } from "@help/shared-types";
import { verifyJwt } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function autenticar(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "unauthorized", message: "Token não informado" });
  }

  const token = header.slice("Bearer ".length);

  try {
    req.user = verifyJwt(token);
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
