import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { autenticar, exigirRole } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";
import { enviarNotificacao } from "../services/notificacao.service";
import { liberarPagamentoDaSolicitacao } from "../services/pagamento.service";
import { distanciaKm } from "../lib/geo";

export const solicitacoesRouter = Router();

solicitacoesRouter.use(autenticar);

const RAIO_BUSCA_KM = 30;

const disponibilidadeSchema = z.array(
  z.object({
    dia: z.string(),
    periodo: z.enum(["manha", "tarde", "noite"]),
  })
);

const criarSolicitacaoSchema = z.object({
  categoriaId: z.string().uuid(),
  enderecoId: z.string().uuid(),
  descricao: z.string().min(5),
  disponibilidade: disponibilidadeSchema.min(1),
  fotos: z.array(z.string().url()).optional(),
});

// Requisitos 10-12: criar solicitação, localizar autônomos elegíveis e notificar.
solicitacoesRouter.post("/", exigirRole("cliente"), async (req, res, next) => {
  try {
    const dados = criarSolicitacaoSchema.parse(req.body);

    const endereco = await prisma.endereco.findFirst({
      where: { id: dados.enderecoId, usuarioId: req.user!.sub },
    });
    if (!endereco) {
      throw new ApiHttpError(404, "endereco_nao_encontrado", "Endereço não encontrado");
    }

    const solicitacao = await prisma.solicitacao.create({
      data: {
        clienteId: req.user!.sub,
        categoriaId: dados.categoriaId,
        enderecoId: dados.enderecoId,
        descricao: dados.descricao,
        disponibilidade: dados.disponibilidade,
        fotos: dados.fotos?.length
          ? { create: dados.fotos.map((url) => ({ url })) }
          : undefined,
      },
      include: { fotos: true },
    });

    const candidatos = await prisma.perfilAutonomo.findMany({
      where: {
        online: true,
        statusAprovacao: "aprovado",
        latitudeAtual: { not: null },
        longitudeAtual: { not: null },
        categorias: { some: { categoriaId: dados.categoriaId } },
      },
      include: { usuario: true },
    });

    const elegiveis = candidatos.filter(
      (autonomo) =>
        distanciaKm(
          Number(endereco.latitude),
          Number(endereco.longitude),
          Number(autonomo.latitudeAtual),
          Number(autonomo.longitudeAtual)
        ) <= RAIO_BUSCA_KM
    );

    await Promise.all(
      elegiveis.map((autonomo) =>
        enviarNotificacao({
          usuarioId: autonomo.usuarioId,
          tipo: "nova_solicitacao",
          titulo: "Nova solicitação de serviço disponível",
          mensagem: `Uma nova solicitação de ${dados.descricao.slice(0, 60)} está disponível na sua região.`,
        })
      )
    );

    res.status(201).json({ ...solicitacao, autonomosNotificados: elegiveis.length });
  } catch (error) {
    next(error);
  }
});

// Requisitos 34-35: listar pedidos do cliente ou trabalhos do autônomo.
solicitacoesRouter.get("/me", async (req, res, next) => {
  try {
    const papel = req.query.papel === "autonomo" ? "autonomo" : "cliente";
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const solicitacoes = await prisma.solicitacao.findMany({
      where: {
        ...(papel === "autonomo"
          ? { autonomoId: req.user!.sub }
          : { clienteId: req.user!.sub }),
        ...(status ? { status: status as never } : {}),
      },
      include: { categoria: true, endereco: true, fotos: true, orcamentos: true, pagamento: true },
      orderBy: { criadoEm: "desc" },
    });

    res.json(solicitacoes);
  } catch (error) {
    next(error);
  }
});

// Requisitos 11-14: solicitações aguardando autônomo, filtradas por
// categoria atendida e raio de distância do autônomo autenticado.
solicitacoesRouter.get("/disponiveis", exigirRole("autonomo"), async (req, res, next) => {
  try {
    const perfil = await prisma.perfilAutonomo.findUnique({
      where: { usuarioId: req.user!.sub },
      include: { categorias: true },
    });

    if (!perfil || perfil.statusAprovacao !== "aprovado") {
      return res.json([]);
    }
    if (perfil.latitudeAtual === null || perfil.longitudeAtual === null) {
      return res.json([]);
    }

    const categoriaIds = perfil.categorias.map((c) => c.categoriaId);
    if (categoriaIds.length === 0) {
      return res.json([]);
    }

    const candidatas = await prisma.solicitacao.findMany({
      where: {
        status: "aguardando_autonomo",
        categoriaId: { in: categoriaIds },
        recusas: { none: { autonomoId: req.user!.sub } },
      },
      include: {
        categoria: true,
        endereco: true,
        fotos: true,
        cliente: { select: { id: true, nome: true, avaliacaoMediaCliente: true } },
      },
      orderBy: { criadoEm: "desc" },
    });

    const disponiveis = candidatas.filter(
      (solicitacao) =>
        distanciaKm(
          Number(perfil.latitudeAtual),
          Number(perfil.longitudeAtual),
          Number(solicitacao.endereco.latitude),
          Number(solicitacao.endereco.longitude)
        ) <= RAIO_BUSCA_KM
    );

    res.json(disponiveis);
  } catch (error) {
    next(error);
  }
});

solicitacoesRouter.get("/:id", async (req, res, next) => {
  try {
    const solicitacao = await buscarSolicitacaoDoUsuario(req.params.id, req.user!.sub);

    let notaMediaCliente: number | undefined;
    if (solicitacao.autonomoId === null) {
      const cliente = await prisma.usuario.findUnique({ where: { id: solicitacao.clienteId } });
      notaMediaCliente = cliente ? Number(cliente.avaliacaoMediaCliente) : undefined;
    }

    res.json({ ...solicitacao, notaMediaCliente });
  } catch (error) {
    next(error);
  }
});

// Requisito 13-14: autônomo aceita a solicitação (vê nota do cliente antes, via GET acima).
solicitacoesRouter.post("/:id/aceitar", exigirRole("autonomo"), async (req, res, next) => {
  try {
    const solicitacao = await prisma.solicitacao.findUnique({ where: { id: req.params.id } });
    if (!solicitacao) throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");
    if (solicitacao.status !== "aguardando_autonomo") {
      throw new ApiHttpError(409, "status_invalido", "Solicitação não está mais disponível");
    }

    const atualizada = await prisma.solicitacao.update({
      where: { id: solicitacao.id },
      data: { autonomoId: req.user!.sub, status: "aceito_pelo_autonomo" },
    });

    await enviarNotificacao({
      usuarioId: solicitacao.clienteId,
      tipo: "solicitacao_aceita",
      titulo: "Sua solicitação foi aceita",
      mensagem: "Um autônomo aceitou sua solicitação de serviço.",
    });

    res.json(atualizada);
  } catch (error) {
    next(error);
  }
});

// Recusa individual: não altera o status da solicitação (outros autônomos
// elegíveis continuam podendo aceitar), só registra que ESTE autônomo já
// recusou, pra ela parar de aparecer nas disponíveis dele.
solicitacoesRouter.post("/:id/recusar", exigirRole("autonomo"), async (req, res, next) => {
  try {
    const solicitacao = await prisma.solicitacao.findUnique({ where: { id: req.params.id } });
    if (!solicitacao) throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");

    await prisma.solicitacaoRecusa.upsert({
      where: { solicitacaoId_autonomoId: { solicitacaoId: solicitacao.id, autonomoId: req.user!.sub } },
      update: {},
      create: { solicitacaoId: solicitacao.id, autonomoId: req.user!.sub },
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Requisito 15: agendar visita técnica.
const visitaSchema = z.object({ dataHora: z.string().datetime() });

solicitacoesRouter.post("/:id/visita", exigirRole("autonomo"), async (req, res, next) => {
  try {
    const solicitacao = await buscarComoAutonomo(req.params.id, req.user!.sub);
    const { dataHora } = visitaSchema.parse(req.body);

    const visita = await prisma.visitaTecnica.upsert({
      where: { solicitacaoId: solicitacao.id },
      update: { dataHora: new Date(dataHora) },
      create: { solicitacaoId: solicitacao.id, dataHora: new Date(dataHora) },
    });

    await prisma.solicitacao.update({
      where: { id: solicitacao.id },
      data: { status: "visita_agendada" },
    });

    await enviarNotificacao({
      usuarioId: solicitacao.clienteId,
      tipo: "visita_agendada",
      titulo: "Visita técnica agendada",
      mensagem: `Visita agendada para ${new Date(dataHora).toLocaleString("pt-BR")}.`,
    });

    res.status(201).json(visita);
  } catch (error) {
    next(error);
  }
});

solicitacoesRouter.post("/:id/visita/realizar", exigirRole("autonomo"), async (req, res, next) => {
  try {
    const solicitacao = await buscarComoAutonomo(req.params.id, req.user!.sub);
    const observacoes = typeof req.body?.observacoes === "string" ? req.body.observacoes : undefined;

    const visita = await prisma.visitaTecnica.update({
      where: { solicitacaoId: solicitacao.id },
      data: { realizada: true, observacoes },
    });

    res.json(visita);
  } catch (error) {
    next(error);
  }
});

// Requisitos 24-25: confirmação mútua de conclusão do serviço.
solicitacoesRouter.post("/:id/concluir", async (req, res, next) => {
  try {
    const solicitacao = await buscarSolicitacaoDoUsuario(req.params.id, req.user!.sub);

    if (solicitacao.status !== "em_andamento" && solicitacao.status !== "pago") {
      throw new ApiHttpError(409, "status_invalido", "Serviço ainda não está em execução");
    }

    const ehCliente = solicitacao.clienteId === req.user!.sub;
    const data = ehCliente
      ? { concluidoClienteEm: new Date() }
      : { concluidoAutonomoEm: new Date() };

    let atualizada = await prisma.solicitacao.update({
      where: { id: solicitacao.id },
      data,
    });

    if (atualizada.concluidoClienteEm && atualizada.concluidoAutonomoEm) {
      atualizada = await prisma.solicitacao.update({
        where: { id: solicitacao.id },
        data: { status: "concluido" },
      });

      await liberarPagamentoDaSolicitacao(solicitacao.id);

      await Promise.all(
        [solicitacao.clienteId, solicitacao.autonomoId].filter(Boolean).map((usuarioId) =>
          enviarNotificacao({
            usuarioId: usuarioId as string,
            tipo: "servico_concluido",
            titulo: "Serviço concluído",
            mensagem: "O serviço foi confirmado como concluído por ambas as partes.",
          })
        )
      );
    }

    res.json(atualizada);
  } catch (error) {
    next(error);
  }
});

async function buscarSolicitacaoDoUsuario(id: string, usuarioId: string) {
  const solicitacao = await prisma.solicitacao.findFirst({
    where: { id, OR: [{ clienteId: usuarioId }, { autonomoId: usuarioId }] },
    include: { categoria: true, endereco: true, fotos: true, visitaTecnica: true, orcamentos: true, pagamento: true },
  });
  if (!solicitacao) {
    throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");
  }
  return solicitacao;
}

async function buscarComoAutonomo(id: string, autonomoId: string) {
  const solicitacao = await prisma.solicitacao.findFirst({ where: { id, autonomoId } });
  if (!solicitacao) {
    throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");
  }
  return solicitacao;
}
