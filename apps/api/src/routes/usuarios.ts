import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { autenticar } from "../middleware/auth";
import { ApiHttpError } from "../middleware/errorHandler";
import { enviarNotificacao } from "../services/notificacao.service";
import { geocodificarEndereco } from "../services/geocoding.service";
import { senhaForteRegex } from "./auth";
import {
  RESET_TENTATIVAS_MAXIMAS,
  RESET_TOKEN_VALIDADE_MS,
  emailConfigurado,
  enviarCodigoEmail,
  gerarCodigo,
  hashCodigo,
} from "../services/resetSenha.service";

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
  email: z.string().email().optional(),
});

usuariosRouter.patch("/me", async (req, res, next) => {
  try {
    const dados = atualizarPerfilSchema.parse(req.body);

    if (dados.email) {
      const emailEmUso = await prisma.usuario.findFirst({
        where: { email: dados.email, id: { not: req.user!.sub } },
      });
      if (emailEmUso) throw new ApiHttpError(409, "email_em_uso", "E-mail já cadastrado em outra conta");
    }

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

const solicitarCodigoSenhaSchema = z.object({
  senhaAtual: z.string().min(1),
});

// Alterar senha (logado) exige confirmar a senha atual E um código
// enviado por e-mail (segunda etapa) — diferente do "esqueci minha senha"
// (sem sessão), aqui já sabemos quem é o usuário, então usa req.user
// direto em vez de pedir e-mail de novo.
usuariosRouter.post("/me/senha/solicitar-codigo", async (req, res, next) => {
  try {
    const { senhaAtual } = solicitarCodigoSenhaSchema.parse(req.body);
    const usuario = await prisma.usuario.findUnique({ where: { id: req.user!.sub } });

    if (!usuario?.senhaHash || !(await bcrypt.compare(senhaAtual, usuario.senhaHash))) {
      throw new ApiHttpError(401, "senha_atual_invalida", "Senha atual incorreta");
    }

    const codigo = gerarCodigo();
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        resetSenhaTokenHash: hashCodigo(codigo),
        resetSenhaExpiraEm: new Date(Date.now() + RESET_TOKEN_VALIDADE_MS),
        resetSenhaTentativas: 0,
      },
    });

    await enviarCodigoEmail({
      destinatario: usuario.email,
      codigo,
      assunto: "Código para confirmar a alteração de senha",
      introducao: "Use o código abaixo pra confirmar a alteração de senha da sua conta HelpMate:",
    });

    const respostaGenerica = { message: "Enviamos um código de confirmação pro seu e-mail." };
    res.json(emailConfigurado ? respostaGenerica : { ...respostaGenerica, devToken: codigo });
  } catch (error) {
    next(error);
  }
});

const confirmarAlteracaoSenhaSchema = z.object({
  token: z.string().min(1),
  novaSenha: z
    .string()
    .min(8)
    .regex(senhaForteRegex, "Senha deve ter letra maiúscula, minúscula, número e caractere especial"),
});

usuariosRouter.post("/me/senha/confirmar", async (req, res, next) => {
  try {
    const { token, novaSenha } = confirmarAlteracaoSenhaSchema.parse(req.body);
    const usuario = await prisma.usuario.findUnique({ where: { id: req.user!.sub } });

    if (!usuario || !usuario.resetSenhaExpiraEm || usuario.resetSenhaExpiraEm.getTime() < Date.now()) {
      throw new ApiHttpError(400, "codigo_invalido_ou_expirado", "Código inválido ou expirado. Solicite um novo.");
    }

    if (usuario.resetSenhaTentativas >= RESET_TENTATIVAS_MAXIMAS) {
      throw new ApiHttpError(429, "muitas_tentativas", "Muitas tentativas com esse código. Solicite um novo.");
    }

    if (usuario.resetSenhaTokenHash !== hashCodigo(token)) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { resetSenhaTentativas: { increment: 1 } },
      });
      throw new ApiHttpError(400, "codigo_invalido_ou_expirado", "Código inválido ou expirado. Solicite um novo.");
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash, resetSenhaTokenHash: null, resetSenhaExpiraEm: null, resetSenhaTentativas: 0 },
    });

    res.json({ message: "Senha alterada com sucesso." });
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

    // Latitude/longitude não vêm do cliente — o usuário não tem motivo pra
    // saber ou informar coordenadas, isso é um detalhe interno do sistema
    // (usado só pro cálculo de distância entre cliente e autônomo).
    const coordenadas = await geocodificarEndereco(dados);
    if (!coordenadas) {
      throw new ApiHttpError(
        422,
        "endereco_nao_localizado",
        "Não foi possível localizar esse endereço automaticamente. Confira o CEP e tente novamente."
      );
    }

    const endereco = await prisma.endereco.create({
      data: { ...dados, ...coordenadas, usuarioId: req.user!.sub },
    });
    res.status(201).json(endereco);
  } catch (error) {
    next(error);
  }
});

// ---- Solicitação para virar Autônomo ----

usuariosRouter.get("/me/solicitar-autonomo", async (req, res, next) => {
  try {
    const solicitacao = await prisma.solicitacaoAutonomo.findFirst({
      where: { usuarioId: req.user!.sub },
      orderBy: { criadoEm: "desc" },
    });
    res.json(solicitacao);
  } catch (error) {
    next(error);
  }
});

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

const precoCategoriaSchema = z.object({ precoBase: z.number().positive().nullable() });

// Preço "a partir de" por categoria atendida, pro perfil público — rota
// separada de PUT /me/autonomo/categorias pra não mexer no contrato já
// usado pela tela de seleção de categorias.
usuariosRouter.patch("/me/autonomo/categorias/:categoriaId/preco", async (req, res, next) => {
  try {
    const perfil = await getPerfilAutonomoAtivo(req.user!.sub);
    const { precoBase } = precoCategoriaSchema.parse(req.body);

    const vinculo = await prisma.autonomoCategoria.findUnique({
      where: { autonomoId_categoriaId: { autonomoId: perfil.id, categoriaId: req.params.categoriaId } },
    });
    if (!vinculo) {
      throw new ApiHttpError(404, "categoria_nao_atendida", "Você não atende essa categoria");
    }

    const atualizado = await prisma.autonomoCategoria.update({
      where: { autonomoId_categoriaId: { autonomoId: perfil.id, categoriaId: req.params.categoriaId } },
      data: { precoBase },
      include: { categoria: true },
    });
    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

const bioSchema = z.object({ bio: z.string().max(1000).nullable() });

usuariosRouter.patch("/me/autonomo/bio", async (req, res, next) => {
  try {
    const perfil = await getPerfilAutonomoAtivo(req.user!.sub);
    const { bio } = bioSchema.parse(req.body);

    const atualizado = await prisma.perfilAutonomo.update({ where: { id: perfil.id }, data: { bio } });
    res.json(atualizado);
  } catch (error) {
    next(error);
  }
});

const fotoPortfolioSchema = z.object({ url: z.string().url() });

usuariosRouter.post("/me/autonomo/fotos", async (req, res, next) => {
  try {
    const perfil = await getPerfilAutonomoAtivo(req.user!.sub);
    const { url } = fotoPortfolioSchema.parse(req.body);

    const foto = await prisma.perfilAutonomoFoto.create({ data: { perfilAutonomoId: perfil.id, url } });
    res.status(201).json(foto);
  } catch (error) {
    next(error);
  }
});

usuariosRouter.delete("/me/autonomo/fotos/:fotoId", async (req, res, next) => {
  try {
    const perfil = await getPerfilAutonomoAtivo(req.user!.sub);
    await prisma.perfilAutonomoFoto.deleteMany({
      where: { id: req.params.fotoId, perfilAutonomoId: perfil.id },
    });
    res.status(204).send();
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
