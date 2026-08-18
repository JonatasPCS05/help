export type StatusAprovacao = "pendente" | "aprovado" | "rejeitado";

export type StatusSolicitacao =
  | "aguardando_autonomo"
  | "aceito_pelo_autonomo"
  | "recusado_pelo_autonomo"
  | "visita_agendada"
  | "orcamento_enviado"
  | "orcamento_aceito"
  | "orcamento_recusado"
  | "pago"
  | "em_andamento"
  | "concluido"
  | "cancelado"
  | "em_disputa";

export type StatusOrcamento = "pendente" | "aceito" | "recusado";

export type StatusPagamento = "retido" | "liberado" | "reembolsado" | "cancelado";

export type StatusCancelamento = "pendente_analise" | "aprovado" | "rejeitado";

export type Canal = "push" | "email" | "whatsapp";

export type Role = "cliente" | "autonomo" | "admin";

export interface JwtPayload {
  sub: string; // usuario.id
  email: string;
  isCliente: boolean;
  isAutonomo: boolean;
  isAdmin: boolean;
}

export interface DisponibilidadeItem {
  dia: string; // ISO date, ex: "2026-08-20"
  periodo: "manha" | "tarde" | "noite";
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string | null;
  fotoUrl: string | null;
  isCliente: boolean;
  isAutonomo: boolean;
  isAdmin: boolean;
  avaliacaoMediaCliente: number;
  avaliacaoMediaAutonomo: number;
  ativo: boolean;
  criadoEm: string;
}

export interface Categoria {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface Endereco {
  id: string;
  usuarioId: string;
  rua: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  latitude: number;
  longitude: number;
  principal: boolean;
}

export interface PerfilAutonomo {
  id: string;
  usuarioId: string;
  cnpj: string;
  razaoSocial: string;
  documentoCnpjUrl: string;
  statusAprovacao: StatusAprovacao;
  online: boolean;
  latitudeAtual: number | null;
  longitudeAtual: number | null;
}

export interface Solicitacao {
  id: string;
  clienteId: string;
  autonomoId: string | null;
  categoriaId: string;
  enderecoId: string;
  descricao: string;
  disponibilidade: DisponibilidadeItem[];
  status: StatusSolicitacao;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Orcamento {
  id: string;
  solicitacaoId: string;
  valor: number;
  descricao: string | null;
  status: StatusOrcamento;
}

export interface Pagamento {
  id: string;
  solicitacaoId: string;
  valorTotal: number;
  taxaPlataformaPercentual: number;
  taxaPlataformaValor: number;
  valorAutonomo: number;
  stoneTransactionId: string | null;
  status: StatusPagamento;
}

export interface Avaliacao {
  id: string;
  solicitacaoId: string;
  avaliadorId: string;
  avaliadoId: string;
  nota: number;
  comentario: string | null;
}

export interface Cancelamento {
  id: string;
  solicitacaoId: string;
  solicitadoPor: string;
  motivo: string;
  dentroDoPrazo: boolean | null;
  taxaAplicada: number | null;
  reembolsoTotal: boolean;
  status: StatusCancelamento;
}

export interface Notificacao {
  id: string;
  usuarioId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  canal: Canal;
  lida: boolean;
  criadoEm: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
