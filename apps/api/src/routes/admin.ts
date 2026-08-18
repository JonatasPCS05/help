import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { autenticar, exigirRole } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";
import { enviarNotificacao } from "../services/notificacao.service";
import { reembolsarPagamentoDaSolicitacao } from "../services/pagamento.service";

export const adminRouter = Router();

adminRouter.use(autenticar, exigirRole("admin"));

// Requisito 39: listar e gerenciar todos os usuários.
adminRouter.get("/usuarios", async (req, res, next) => {
  try {
    const busca = typeof req.query.busca === "string" ? req.query.busca : undefined;

    const usuarios = await prisma.usuario.findMany({
      where: busca
        ? { OR: [{ nome: { contains: busca, mode: "insensitive" } }, { email: { contains: busca, mode: "insensitive" } }] }
        : undefined,
      orderBy: { criadoEm: "desc" },
      take: 200,
    });

    res.json(usuarios.map(({ senhaHash, ...resto }) => resto));
  } catch (error) {
    next(error);
  }
});

const atualizarUsuarioSchema = z.object({ ativo: z.boolean().optional() });

adminRouter.patch("/usuarios/:id", async (req, res, next) => {
  try {
    const dados = atualizarUsuarioSchema.parse(req.body);
    const usuario = await prisma.usuario.update({ where: { id: req.params.id }, data: dados });
    const { senhaHash, ...resto } = usuario;
    res.json(resto);
  } catch (error) {
    next(error);
  }
});

// Requisito 40: aprovar/rejeitar solicitações para virar Autônomo, validando o CNPJ.
adminRouter.get("/solicitacoes-autonomo", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "pendente";

    const solicitacoes = await prisma.solicitacaoAutonomo.findMany({
      where: { status: status as never },
      include: { usuario: { select: { id: true, nome: true, email: true, cpf: true } } },
      orderBy: { criadoEm: "desc" },
    });

    res.json(solicitacoes);
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/solicitacoes-autonomo/:id/aprovar", async (req, res, next) => {
  try {
    const solicitacao = await prisma.solicitacaoAutonomo.findUnique({
      where: { id: req.params.id },
      include: { usuario: true },
    });
    if (!solicitacao) throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");
    if (solicitacao.status !== "pendente") {
      throw new ApiHttpError(409, "status_invalido", "Solicitação já foi analisada");
    }

    await prisma.$transaction([
      prisma.solicitacaoAutonomo.update({
        where: { id: solicitacao.id },
        data: { status: "aprovado", analisadoPorAdminId: req.user!.sub, resolvidoEm: new Date() },
      }),
      prisma.perfilAutonomo.upsert({
        where: { usuarioId: solicitacao.usuarioId },
        update: { cnpj: solicitacao.cnpj, documentoCnpjUrl: solicitacao.documentoCnpjUrl, statusAprovacao: "aprovado" },
        create: {
          usuarioId: solicitacao.usuarioId,
          cnpj: solicitacao.cnpj,
          razaoSocial: solicitacao.usuario.nome,
          documentoCnpjUrl: solicitacao.documentoCnpjUrl,
          statusAprovacao: "aprovado",
        },
      }),
      prisma.usuario.update({ where: { id: solicitacao.usuarioId }, data: { isAutonomo: true } }),
    ]);

    await enviarNotificacao({
      usuarioId: solicitacao.usuarioId,
      tipo: "autonomo_aprovado",
      titulo: "Cadastro de Autônomo aprovado",
      mensagem: "Seu cadastro como Autônomo foi aprovado. Escolha suas categorias e fique online para receber pedidos.",
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

const rejeitarSchema = z.object({ motivo: z.string().optional() });

adminRouter.post("/solicitacoes-autonomo/:id/rejeitar", async (req, res, next) => {
  try {
    const dados = rejeitarSchema.parse(req.body ?? {});

    const solicitacao = await prisma.solicitacaoAutonomo.findUnique({ where: { id: req.params.id } });
    if (!solicitacao) throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");
    if (solicitacao.status !== "pendente") {
      throw new ApiHttpError(409, "status_invalido", "Solicitação já foi analisada");
    }

    await prisma.solicitacaoAutonomo.update({
      where: { id: solicitacao.id },
      data: { status: "rejeitado", analisadoPorAdminId: req.user!.sub, resolvidoEm: new Date() },
    });

    await enviarNotificacao({
      usuarioId: solicitacao.usuarioId,
      tipo: "autonomo_rejeitado",
      titulo: "Cadastro de Autônomo rejeitado",
      mensagem: dados.motivo ?? "Seu cadastro como Autônomo não foi aprovado. Verifique os documentos enviados.",
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Requisito 41: visualizar e resolver cancelamentos/disputas.
adminRouter.get("/cancelamentos", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "pendente_analise";

    const cancelamentos = await prisma.cancelamento.findMany({
      where: { status: status as never },
      include: {
        solicitacao: {
          include: {
            cliente: { select: { id: true, nome: true, email: true } },
            autonomo: { select: { id: true, nome: true, email: true } },
            orcamentos: { where: { status: "aceito" } },
          },
        },
      },
      orderBy: { criadoEm: "desc" },
    });

    res.json(cancelamentos);
  } catch (error) {
    next(error);
  }
});

const resolverDisputaSchema = z.object({
  aprovar: z.boolean(),
  reembolsoTotal: z.boolean().optional(),
});

adminRouter.post("/cancelamentos/:id/resolver", async (req, res, next) => {
  try {
    const dados = resolverDisputaSchema.parse(req.body);

    const cancelamento = await prisma.cancelamento.findUnique({
      where: { id: req.params.id },
      include: { solicitacao: true },
    });
    if (!cancelamento) throw new ApiHttpError(404, "nao_encontrado", "Cancelamento não encontrado");
    if (cancelamento.status !== "pendente_analise") {
      throw new ApiHttpError(409, "status_invalido", "Caso já foi resolvido");
    }

    const atualizado = await prisma.cancelamento.update({
      where: { id: cancelamento.id },
      data: {
        status: dados.aprovar ? "aprovado" : "rejeitado",
        analisadoPorAdminId: req.user!.sub,
        resolvidoEm: new Date(),
        reembolsoTotal: dados.reembolsoTotal ?? cancelamento.reembolsoTotal,
      },
    });

    if (dados.aprovar) {
      await prisma.solicitacao.update({
        where: { id: cancelamento.solicitacaoId },
        data: { status: "cancelado" },
      });
      await reembolsarPagamentoDaSolicitacao(cancelamento.solicitacaoId);
    }

    await enviarNotificacao({
      usuarioId: cancelamento.solicitadoPor,
      tipo: "disputa_resolvida",
      titulo: "Disputa resolvida",
      mensagem: dados.aprovar
        ? "Sua solicitação de cancelamento/reembolso foi aprovada pelo Admin."
        : "Sua solicitação de cancelamento/reembolso foi rejeitada pelo Admin.",
    });

    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

// Requisito 42: resumo geral de transações e taxas arrecadadas.
adminRouter.get("/resumo", async (req, res, next) => {
  try {
    const [totais, porStatus, totalUsuarios, solicitacoesAtivas, disputasAbertas] = await Promise.all([
      prisma.pagamento.aggregate({
        _sum: { valorTotal: true, taxaPlataformaValor: true, valorAutonomo: true },
        _count: true,
      }),
      prisma.pagamento.groupBy({ by: ["status"], _count: true, _sum: { valorTotal: true } }),
      prisma.usuario.count(),
      prisma.solicitacao.count({
        where: {
          status: {
            notIn: ["concluido", "cancelado", "recusado_pelo_autonomo", "orcamento_recusado"],
          },
        },
      }),
      prisma.cancelamento.count({ where: { status: "pendente_analise" } }),
    ]);

    res.json({
      totalUsuarios,
      solicitacoesAtivas,
      disputasAbertas,
      totalTransacoes: totais._count,
      valorTotalTransacionado: totais._sum.valorTotal ?? 0,
      taxaTotalArrecadada: totais._sum.taxaPlataformaValor ?? 0,
      valorTotalRepassadoAutonomos: totais._sum.valorAutonomo ?? 0,
      porStatus,
    });
  } catch (error) {
    next(error);
  }
});
