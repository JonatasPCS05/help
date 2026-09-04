import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";

export class ApiHttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiHttpError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }

  if (err instanceof MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Arquivo maior que 5MB" : "Não foi possível processar o arquivo";
    return res.status(422).json({ error: "arquivo_invalido", message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "validation_error",
      message: "Dados inválidos",
      details: err.flatten(),
    });
  }

  console.error(err);
  return res.status(500).json({ error: "internal_error", message: "Erro interno do servidor" });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "not_found", message: "Rota não encontrada" });
}
