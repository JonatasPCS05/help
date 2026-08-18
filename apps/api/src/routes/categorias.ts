import { Router } from "express";
import { prisma } from "../lib/prisma";

export const categoriasRouter = Router();

categoriasRouter.get("/", async (_req, res, next) => {
  try {
    const categorias = await prisma.categoria.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
    res.json(categorias);
  } catch (error) {
    next(error);
  }
});
