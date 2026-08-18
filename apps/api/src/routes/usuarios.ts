import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";
import { enviarNotificacao } from "../services/notificacao.service";

export const usuariosRouter = Router();

usuariosRouter.use(autenticar);

usuariosRouter.get("/me", async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user!.sub },
      include: { perfilAutonomo: { include: { categorias: { include: { categoria: true } } } } },
    });

    if (!usuario) throw new ApiHttpError(404, "usuario_nao_encontrado", "Usuário não encontrado");

    const { senhaHash, ...resto } = usuario;
    res.json(resto);
  } catch (error) {
    next(error);
  }
});

const atualizarPerfilSchema = z.object({
  nome: z.string().min(2).optional(),
  telefone: z.string().optional(),
  fotoUrl: z.string().url().optional(),
});

usuariosRouter.patch("/me", async (req, res, next) => {
  try {
    const dados = atualizarPerfilSchema.parse(req.body);
    const usuario = await prisma.usuario.update({
      where: { id: req.user!.sub },
      data: dados,
    });
    const { senhaHash, ...resto } = usuario;
    res.json(resto);
  } catch (error) {
    next(error);
  }
});

// ---- Endereços ----

const enderecoSchema = z.object({
  rua: z.string().min(1),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().min(1),
  cidade: z.string().min(1),
  estado: z.string().length(2),
  cep: z.string().min(8),
  latitude: z.number(),
  longitude: z.number(),
  principal: z.boolean().optional(),
});

usuariosRouter.get("/me/enderecos", async (req, res, next) => {
  try {
    const enderecos = await prisma.endereco.findMany({
      where: { usuarioId: req.user!.sub },
      orderBy: { criadoEm: "desc" },
    });
    res.json(enderecos);
  } catch (error) {
    next(error);
  }
});

usuariosRouter.post("/me/enderecos", async (req, res, next) => {
  try {
    const dados = enderecoSchema.parse(req.body);
    const endereco = await prisma.endereco.create({
      data: { ...dados, usuarioId: req.user!.sub },
    });
    res.status(201).json(endereco);
  } catch (error) {
    next(error);
  }
});

// ---- Solicitação para virar Autônomo ----

const solicitarAutonomoSchema = z.object({
  cnpj: z.string().min(14),
  documentoCnpjUrl: z.string().url(),
});

usuariosRouter.post("/me/solicitar-autonomo", async (req, res, next) => {
  try {
    const dados = solicitarAutonomoSchema.parse(req.body);

    const pendente = await prisma.solicitacaoAutonomo.findFirst({
      where: { usuarioId: req.user!.sub, status: "pendente" },
    });
    if (pendente) {
      throw new ApiHttpError(409, "solicitacao_pendente", "Já existe uma solicitação em análise");
    }

    const solicitacao = await prisma.solicitacaoAutonomo.create({
      data: {
        usuarioId: req.user!.sub,
        cnpj: dados.cnpj,
        documentoCnpjUrl: dados.documentoCnpjUrl,
      },
    });

    const admins = await prisma.usuario.findMany({ where: { isAdmin: true } });
    await Promise.all(
      admins.map((admin) =>
        enviarNotificacao({
          usuarioId: admin.id,
          tipo: "solicitacao_autonomo",
          titulo: "Nova solicitação para virar Autônomo",
          mensagem: `Usuário ${req.user!.email} solicitou aprovação como Autônomo.`,
        })
      )
    );

    res.status(201).json(solicitacao);
  } catch (error) {
    next(error);
  }
});

// ---- Perfil Autônomo ----

const categoriasSchema = z.object({
  categoriaIds: z.array(z.string().uuid()).min(1),
});

usuariosRouter.put("/me/autonomo/categorias", async (req, res, next) => {
  try {
    const perfil = await getPerfilAutonomoAtivo(req.user!.sub);
    const { categoriaIds } = categoriasSchema.parse(req.body);

    await prisma.$transaction([
      prisma.autonomoCategoria.deleteMany({ where: { autonomoId: perfil.id } }),
      prisma.autonomoCategoria.createMany({
        data: categoriaIds.map((categoriaId) => ({ autonomoId: perfil.id, categoriaId })),
      }),
    ]);

    const atualizado = await prisma.perfilAutonomo.findUnique({
      where: { id: perfil.id },
      include: { categorias: { include: { categoria: true } } },
    });
    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

const statusOnlineSchema = z.object({ online: z.boolean() });

usuariosRouter.patch("/me/autonomo/status", async (req, res, next) => {
  try {
    const perfil = await getPerfilAutonomoAtivo(req.user!.sub);
    const { online } = statusOnlineSchema.parse(req.body);

    const atualizado = await prisma.perfilAutonomo.update({
      where: { id: perfil.id },
      data: { online },
    });
    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

const localizacaoSchema = z.object({ latitude: z.number(), longitude: z.number() });

usuariosRouter.patch("/me/autonomo/localizacao", async (req, res, next) => {
  try {
    const perfil = await getPerfilAutonomoAtivo(req.user!.sub);
    const { latitude, longitude } = localizacaoSchema.parse(req.body);

    const atualizado = await prisma.perfilAutonomo.update({
      where: { id: perfil.id },
      data: { latitudeAtual: latitude, longitudeAtual: longitude },
    });
    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

// GET perfil público de um autônomo (nota média + avaliações), requisito 9.
usuariosRouter.get("/autonomos/:id", async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.params.id },
      include: {
        perfilAutonomo: { include: { categorias: { include: { categoria: true } } } },
        avaliacoesRecebidas: { orderBy: { criadoEm: "desc" }, take: 20 },
      },
    });

    if (!usuario?.perfilAutonomo) {
      throw new ApiHttpError(404, "autonomo_nao_encontrado", "Autônomo não encontrado");
    }

    res.json({
      id: usuario.id,
      nome: usuario.nome,
      fotoUrl: usuario.fotoUrl,
      avaliacaoMedia: usuario.avaliacaoMediaAutonomo,
      perfilAutonomo: usuario.perfilAutonomo,
      avaliacoes: usuario.avaliacoesRecebidas,
    });
  } catch (error) {
    next(error);
  }
});

async function getPerfilAutonomoAtivo(usuarioId: string) {
  const perfil = await prisma.perfilAutonomo.findUnique({ where: { usuarioId } });
  if (!perfil) {
    throw new ApiHttpError(403, "nao_e_autonomo", "Usuário não possui perfil de Autônomo");
  }
  if (perfil.statusAprovacao !== "aprovado") {
    throw new ApiHttpError(403, "autonomo_nao_aprovado", "Perfil de Autônomo ainda não aprovado");
  }
  return perfil;
}
