import { Router } from "express";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";

export const favoritosRouter = Router();

favoritosRouter.use(autenticar);

favoritosRouter.get("/", async (req, res, next) => {
  try {
    const favoritos = await prisma.favorito.findMany({
      where: { clienteId: req.user!.sub },
      orderBy: { criadoEm: "desc" },
      include: {
        autonomo: {
          include: {
            usuario: { select: { id: true, nome: true, fotoUrl: true, avaliacaoMediaAutonomo: true } },
            categorias: { include: { categoria: true } },
          },
        },
      },
    });
    res.json(favoritos);
  } catch (error) {
    next(error);
  }
});

favoritosRouter.post("/:autonomoId", async (req, res, next) => {
  try {
    const autonomo = await prisma.perfilAutonomo.findUnique({ where: { id: req.params.autonomoId } });
    if (!autonomo) throw new ApiHttpError(404, "autonomo_nao_encontrado", "Profissional não encontrado");

    const favorito = await prisma.favorito.upsert({
      where: { clienteId_autonomoId: { clienteId: req.user!.sub, autonomoId: req.params.autonomoId } },
      create: { clienteId: req.user!.sub, autonomoId: req.params.autonomoId },
      update: {},
    });
    res.status(201).json(favorito);
  } catch (error) {
    next(error);
  }
});

favoritosRouter.delete("/:autonomoId", async (req, res, next) => {
  try {
    await prisma.favorito.deleteMany({
      where: { clienteId: req.user!.sub, autonomoId: req.params.autonomoId },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
