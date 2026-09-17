import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { autenticar, exigirRole } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";
import { enviarNotificacao } from "../services/notificacao.service";
import { liberarPagamentoDaSolicitacao } from "../services/pagamento.service";
import { expirarSolicitacoesAntigas } from "../services/solicitacao.service";
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

    const categoria = await prisma.categoria.findUnique({ where: { id: dados.categoriaId } });
    if (!categoria) {
      throw new ApiHttpError(404, "categoria_nao_encontrada", "Categoria não encontrada");
    }
    // "Outro Serviço" é um catch-all pra pedido que não se encaixa nas
    // categorias existentes — fica invisível pros autônomos até um admin
    // revisar (e, se fizer sentido, reclassificar numa categoria de verdade).
    const precisaRevisao = categoria.nome === "Outro Serviço";

    const solicitacao = await prisma.solicitacao.create({
      data: {
        clienteId: req.user!.sub,
        categoriaId: dados.categoriaId,
        enderecoId: dados.enderecoId,
        descricao: dados.descricao,
        disponibilidade: dados.disponibilidade,
        revisadoAdmin: !precisaRevisao,
        fotos: dados.fotos?.length
          ? { create: dados.fotos.map((url) => ({ url })) }
          : undefined,
      },
      include: { fotos: true },
    });

    if (precisaRevisao) {
      res.status(201).json({ ...solicitacao, autonomosNotificados: 0 });
      return;
    }

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
    await expirarSolicitacoesAntigas();
    const papel = req.query.papel === "autonomo" ? "autonomo" : "cliente";
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const solicitacoes = await prisma.solicitacao.findMany({
      where: {
        ...(papel === "autonomo"
          ? { autonomoId: req.user!.sub }
          : { clienteId: req.user!.sub }),
        ...(status ? { status: status as never } : {}),
      },
      include: {
        categoria: true,
        endereco: true,
        fotos: true,
        orcamentos: true,
        pagamento: true,
        visitaTecnica: true,
        cliente: { select: { id: true, nome: true, avaliacaoMediaCliente: true } },
        autonomo: { select: { id: true, nome: true, avaliacaoMediaAutonomo: true } },
      },
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
    await expirarSolicitacoesAntigas();
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
        revisadoAdmin: true,
      },
      include: {
        categoria: true,
        // Antes de aceitar, o autônomo só precisa saber a região — rua,
        // número, complemento e CEP exatos só são liberados depois que
        // ele aceita (GET /:id devolve o endereço completo nesse caso).
        endereco: { select: { bairro: true, cidade: true, estado: true, latitude: true, longitude: true } },
        fotos: true,
        cliente: { select: { id: true, nome: true, avaliacaoMediaCliente: true } },
      },
      orderBy: { criadoEm: "desc" },
    });

    const disponiveis = candidatas
      .filter(
        (solicitacao) =>
          distanciaKm(
            Number(perfil.latitudeAtual),
            Number(perfil.longitudeAtual),
            Number(solicitacao.endereco.latitude),
            Number(solicitacao.endereco.longitude)
          ) <= RAIO_BUSCA_KM
      )
      // latitude/longitude exatas também só servem pro cálculo acima —
      // não precisam sair no JSON de resposta.
      .map(({ endereco, ...resto }) => ({
        ...resto,
        endereco: { bairro: endereco.bairro, cidade: endereco.cidade, estado: endereco.estado },
      }));

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

// Reaproveitada por /aceitar — os mesmos critérios que definem se uma
// solicitação aparece em /disponiveis (aprovação, categoria, raio de
// 30km) precisam valer também na hora de aceitar, senão um autônomo
// pendente/fora da categoria/fora do raio conseguiria aceitar direto
// pela rota, sem nunca ter visto o pedido na lista.
async function verificarElegibilidadeAutonomo(solicitacao: { categoriaId: string; enderecoId: string }, autonomoId: string) {
  const perfil = await prisma.perfilAutonomo.findUnique({
    where: { usuarioId: autonomoId },
    include: { categorias: true },
  });

  if (!perfil || perfil.statusAprovacao !== "aprovado") {
    throw new ApiHttpError(403, "autonomo_nao_aprovado", "Seu cadastro de autônomo ainda não foi aprovado");
  }
  if (perfil.latitudeAtual === null || perfil.longitudeAtual === null) {
    throw new ApiHttpError(403, "localizacao_nao_definida", "Defina sua localização antes de aceitar pedidos");
  }
  if (!perfil.categorias.some((c) => c.categoriaId === solicitacao.categoriaId)) {
    throw new ApiHttpError(403, "categoria_nao_atendida", "Esse pedido não é de uma categoria que você atende");
  }

  const endereco = await prisma.endereco.findUnique({ where: { id: solicitacao.enderecoId } });
  if (!endereco) throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");

  const distancia = distanciaKm(
    Number(perfil.latitudeAtual),
    Number(perfil.longitudeAtual),
    Number(endereco.latitude),
    Number(endereco.longitude)
  );
  if (distancia > RAIO_BUSCA_KM) {
    throw new ApiHttpError(403, "fora_do_raio", "Esse pedido está fora do seu raio de atendimento");
  }
}

// Requisito 13-14: autônomo aceita a solicitação (vê nota do cliente antes, via GET acima).
solicitacoesRouter.post("/:id/aceitar", exigirRole("autonomo"), async (req, res, next) => {
  try {
    const solicitacao = await prisma.solicitacao.findUnique({ where: { id: req.params.id } });
    if (!solicitacao) throw new ApiHttpError(404, "nao_encontrada", "Solicitação não encontrada");
    if (solicitacao.status !== "aguardando_autonomo") {
      throw new ApiHttpError(409, "status_invalido", "Solicitação não está mais disponível");
    }

    await verificarElegibilidadeAutonomo(solicitacao, req.user!.sub);

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
const visitaSchema = z.object({
  dataHora: z
    .string()
    .datetime()
    .refine((valor) => new Date(valor).getTime() > Date.now(), "A data da visita não pode estar no passado"),
});

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

// O autônomo marca explicitamente que começou a execução do serviço
// (pago -> em_andamento). Sem essa rota o status "em_andamento" nunca
// era usado por ninguém — a conclusão só aceitava "pago" direto.
solicitacoesRouter.post("/:id/iniciar", exigirRole("autonomo"), async (req, res, next) => {
  try {
    const solicitacao = await buscarComoAutonomo(req.params.id, req.user!.sub);
    if (solicitacao.status !== "pago") {
      throw new ApiHttpError(409, "status_invalido", "O serviço só pode ser iniciado depois do pagamento");
    }

    const atualizada = await prisma.solicitacao.update({
      where: { id: solicitacao.id },
      data: { status: "em_andamento" },
    });

    await enviarNotificacao({
      usuarioId: solicitacao.clienteId,
      tipo: "servico_iniciado",
      titulo: "Serviço iniciado",
      mensagem: "O autônomo iniciou a execução do seu serviço.",
    });

    res.json(atualizada);
  } catch (error) {
    next(error);
  }
});

// Requisitos 24-25: confirmação mútua de conclusão do serviço.
solicitacoesRouter.post("/:id/concluir", async (req, res, next) => {
  try {
    const solicitacao = await buscarSolicitacaoDoUsuario(req.params.id, req.user!.sub);

    // "pago" sozinho não basta mais — o autônomo precisa confirmar que
    // iniciou (POST /:id/iniciar) antes de qualquer lado poder concluir.
    if (solicitacao.status !== "em_andamento") {
      throw new ApiHttpError(409, "status_invalido", "Serviço ainda não foi iniciado pelo autônomo");
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
    include: {
      categoria: true,
      endereco: true,
      fotos: true,
      visitaTecnica: true,
      orcamentos: { orderBy: { criadoEm: "desc" } },
      pagamento: true,
      cliente: { select: { id: true, nome: true, avaliacaoMediaCliente: true, telefone: true } },
      autonomo: { select: { id: true, nome: true, avaliacaoMediaAutonomo: true, telefone: true } },
    },
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
