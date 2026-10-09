import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiHttpError } from "../middleware/errorHandler";
import { distanciaKm } from "../lib/geo";
import { geocodificarCidade, geocodificarReverso } from "../services/geocoding.service";

// Diretório público de profissionais — ao contrário de /usuarios (que exige
// login), essas rotas são abertas, igual uma página de busca de qualquer
// marketplace: dá pra navegar/filtrar profissionais sem conta. Nunca
// expõe lat/long exata, CNPJ ou documento — só o necessário pra listar e
// detalhar um perfil.
export const publicoRouter = Router();

const RAIO_BUSCA_KM = 30;

const buscaSchema = z.object({
  categoria: z.string().optional(),
  localizacao: z.string().optional(),
  avaliacaoMinima: z.coerce.number().min(0).max(5).optional(),
  precoMax: z.coerce.number().positive().optional(),
  disponivelHoje: z.coerce.boolean().optional(),
  ordenar: z.enum(["avaliacao", "preco", "recentes"]).default("avaliacao"),
});

publicoRouter.get("/autonomos", async (req, res, next) => {
  try {
    const filtros = buscaSchema.parse(req.query);

    const pontoBusca = filtros.localizacao ? await geocodificarCidade(filtros.localizacao) : null;

    const candidatos = await prisma.perfilAutonomo.findMany({
      where: {
        statusAprovacao: "aprovado",
        ...(filtros.disponivelHoje ? { online: true } : {}),
        ...(filtros.categoria
          ? { categorias: { some: { categoria: { nome: { equals: filtros.categoria, mode: "insensitive" } } } } }
          : {}),
      },
      include: {
        usuario: { select: { id: true, nome: true, fotoUrl: true, avaliacaoMediaAutonomo: true, criadoEm: true } },
        categorias: { include: { categoria: true } },
      },
    });

    let resultado = candidatos.map((autonomo) => {
      const precoMinimo = autonomo.categorias
        .map((c) => (c.precoBase ? Number(c.precoBase) : null))
        .filter((v): v is number => v !== null)
        .sort((a, b) => a - b)[0];

      const distanciaKmCalculada =
        pontoBusca && autonomo.latitudeAtual && autonomo.longitudeAtual
          ? distanciaKm(
              pontoBusca.latitude,
              pontoBusca.longitude,
              Number(autonomo.latitudeAtual),
              Number(autonomo.longitudeAtual)
            )
          : null;

      return {
        id: autonomo.id,
        usuario: autonomo.usuario,
        online: autonomo.online,
        avaliacaoMedia: autonomo.usuario.avaliacaoMediaAutonomo,
        categorias: autonomo.categorias.map((c) => ({ nome: c.categoria.nome, precoBase: c.precoBase })),
        precoMinimo: precoMinimo ?? null,
        distanciaKm: distanciaKmCalculada !== null ? Math.round(distanciaKmCalculada * 10) / 10 : null,
      };
    });

    if (pontoBusca) {
      resultado = resultado.filter((a) => a.distanciaKm === null || a.distanciaKm <= RAIO_BUSCA_KM);
    }
    if (filtros.avaliacaoMinima !== undefined) {
      resultado = resultado.filter((a) => Number(a.avaliacaoMedia) >= filtros.avaliacaoMinima!);
    }
    if (filtros.precoMax !== undefined) {
      resultado = resultado.filter((a) => a.precoMinimo === null || a.precoMinimo <= filtros.precoMax!);
    }

    resultado.sort((a, b) => {
      if (filtros.ordenar === "preco") return (a.precoMinimo ?? Infinity) - (b.precoMinimo ?? Infinity);
      if (filtros.ordenar === "recentes") {
        return new Date(b.usuario.criadoEm).getTime() - new Date(a.usuario.criadoEm).getTime();
      }
      return Number(b.avaliacaoMedia) - Number(a.avaliacaoMedia);
    });

    res.json(resultado);
  } catch (error) {
    next(error);
  }
});

publicoRouter.get("/autonomos/:id", async (req, res, next) => {
  try {
    const autonomo = await prisma.perfilAutonomo.findUnique({
      where: { id: req.params.id },
      include: {
        usuario: { select: { id: true, nome: true, fotoUrl: true, avaliacaoMediaAutonomo: true, criadoEm: true } },
        categorias: { include: { categoria: true } },
        fotos: true,
      },
    });

    if (!autonomo || autonomo.statusAprovacao !== "aprovado") {
      throw new ApiHttpError(404, "autonomo_nao_encontrado", "Profissional não encontrado");
    }

    const contagensPorNota = await prisma.avaliacao.groupBy({
      by: ["nota"],
      where: { avaliadoId: autonomo.usuarioId },
      _count: { nota: true },
    });
    const porEstrela: Record<number, { quantidade: number; percentual: number }> = {
      1: { quantidade: 0, percentual: 0 },
      2: { quantidade: 0, percentual: 0 },
      3: { quantidade: 0, percentual: 0 },
      4: { quantidade: 0, percentual: 0 },
      5: { quantidade: 0, percentual: 0 },
    };
    const totalAvaliacoes = contagensPorNota.reduce((soma, linha) => soma + linha._count.nota, 0);
    for (const linha of contagensPorNota) {
      porEstrela[linha.nota] = {
        quantidade: linha._count.nota,
        percentual: totalAvaliacoes > 0 ? Math.round((linha._count.nota / totalAvaliacoes) * 100) : 0,
      };
    }

    const avaliacoesRecentes = await prisma.avaliacao.findMany({
      where: { avaliadoId: autonomo.usuarioId },
      orderBy: { criadoEm: "desc" },
      take: 20,
      select: { id: true, nota: true, comentario: true, criadoEm: true, avaliador: { select: { nome: true } } },
    });

    const regiao =
      autonomo.latitudeAtual && autonomo.longitudeAtual
        ? await geocodificarReverso(Number(autonomo.latitudeAtual), Number(autonomo.longitudeAtual))
        : null;

    res.json({
      id: autonomo.id,
      usuario: autonomo.usuario,
      bio: autonomo.bio,
      online: autonomo.online,
      avaliacaoMedia: autonomo.usuario.avaliacaoMediaAutonomo,
      totalAvaliacoes,
      porEstrela,
      avaliacoesRecentes,
      categorias: autonomo.categorias.map((c) => ({ nome: c.categoria.nome, precoBase: c.precoBase })),
      fotos: autonomo.fotos.map((f) => f.url),
      regiaoAtendida: regiao ? `${regiao.cidade}, ${regiao.estado}` : null,
    });
  } catch (error) {
    next(error);
  }
});
