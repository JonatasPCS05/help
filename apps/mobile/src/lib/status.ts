export const STATUS_LABELS: Record<string, string> = {
  aguardando_autonomo: "Aberto",
  aceito_pelo_autonomo: "Aceito",
  recusado_pelo_autonomo: "Recusado",
  visita_agendada: "Visita agendada",
  orcamento_enviado: "Orçamento enviado",
  orcamento_aceito: "Orçamento aceito",
  orcamento_recusado: "Orçamento recusado",
  pago: "Pago",
  em_andamento: "Em execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
  em_disputa: "Em disputa",
  expirado: "Expirado",
};

export function labelStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// "O que eu preciso fazer agora" pra cada etapa — depende de quem está
// olhando (cliente vê o próprio próximo passo, autônomo vê o dele).
const PROXIMO_PASSO_CLIENTE: Record<string, string> = {
  aguardando_autonomo: "Aguardando um autônomo aceitar",
  aceito_pelo_autonomo: "Aguardando o autônomo agendar a visita",
  visita_agendada: "Visita técnica agendada",
  orcamento_enviado: "Você recebeu um orçamento — responda no pedido",
  orcamento_aceito: "Realize o pagamento pra continuar",
  pago: "Pagamento feito — o serviço começa em breve",
  em_andamento: "Serviço em execução",
  concluido: "Serviço concluído — avalie o profissional",
  cancelado: "Pedido cancelado",
  recusado_pelo_autonomo: "Nenhum autônomo aceitou este pedido",
  orcamento_recusado: "Orçamento recusado",
  em_disputa: "Pedido em análise da equipe",
  expirado: "Nenhum autônomo aceitou a tempo — crie uma nova solicitação",
};

const PROXIMO_PASSO_AUTONOMO: Record<string, string> = {
  aceito_pelo_autonomo: "Agende a visita técnica",
  visita_agendada: "Realize a visita e envie o orçamento",
  orcamento_enviado: "Aguardando resposta do cliente sobre o orçamento",
  orcamento_aceito: "Aguardando o cliente pagar",
  pago: "Pagamento recebido — pode iniciar o serviço",
  em_andamento: "Conclua e confirme quando terminar",
  concluido: "Serviço concluído — avalie o cliente",
  cancelado: "Pedido cancelado",
  em_disputa: "Pedido em análise da equipe",
};

export function proximoPasso(status: string, papel: "cliente" | "autonomo"): string | null {
  const mapa = papel === "autonomo" ? PROXIMO_PASSO_AUTONOMO : PROXIMO_PASSO_CLIENTE;
  return mapa[status] ?? null;
}

export const STATUS_PAGAMENTO_LABELS: Record<string, string> = {
  retido: "Retido (liberado após conclusão)",
  liberado: "Liberado",
  reembolsado: "Reembolsado",
  cancelado: "Cancelado",
};

export function labelStatusPagamento(status: string): string {
  return STATUS_PAGAMENTO_LABELS[status] ?? status;
}
