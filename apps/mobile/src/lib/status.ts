export const STATUS_LABELS: Record<string, string> = {
  aguardando_autonomo: "Aguardando autônomo",
  aceito_pelo_autonomo: "Aceito",
  recusado_pelo_autonomo: "Recusado",
  visita_agendada: "Visita agendada",
  orcamento_enviado: "Orçamento enviado",
  orcamento_aceito: "Orçamento aceito",
  orcamento_recusado: "Orçamento recusado",
  pago: "Pago",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
  em_disputa: "Em disputa",
};

export function labelStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
