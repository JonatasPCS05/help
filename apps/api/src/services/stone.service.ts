import { env } from "../lib/env";

interface CriarCobrancaInput {
  solicitacaoId: string;
  valorTotal: number;
  descricao: string;
}

interface CriarCobrancaResultado {
  transactionId: string;
  checkoutUrl?: string;
}

/**
 * Cria uma cobrança retida (hold) na Stone para o valor total do orçamento.
 * O valor só é capturado/liberado ao autônomo após a confirmação mútua de
 * conclusão do serviço (ver POST /pagamentos/:id/liberar).
 */
export async function criarCobrancaRetida(
  input: CriarCobrancaInput
): Promise<CriarCobrancaResultado> {
  if (!env.STONE_CLIENT_ID || !env.STONE_CLIENT_SECRET) {
    // Ambiente sem credenciais Stone configuradas: retorna um id simulado
    // para permitir o fluxo local/dev seguir sem a integração real.
    return { transactionId: `dev_${input.solicitacaoId}` };
  }

  // TODO: chamar a API real da Stone (POST /transactions) com captura
  // retida (split de pagamento), usando STONE_CLIENT_ID/SECRET.
  return { transactionId: `dev_${input.solicitacaoId}` };
}

export async function liberarValorAutonomo(transactionId: string): Promise<void> {
  if (!env.STONE_CLIENT_ID || !env.STONE_CLIENT_SECRET) return;
  // TODO: chamar a API da Stone para capturar/liberar o valor retido ao
  // autônomo, descontada a taxa da plataforma.
  void transactionId;
}

export async function reembolsarCliente(transactionId: string): Promise<void> {
  if (!env.STONE_CLIENT_ID || !env.STONE_CLIENT_SECRET) return;
  // TODO: chamar a API da Stone para estornar o valor retido ao cliente.
  void transactionId;
}

export function validarAssinaturaWebhook(payload: unknown, assinatura: string | undefined): boolean {
  if (!env.STONE_WEBHOOK_SECRET) return true;
  // TODO: validar a assinatura HMAC do webhook usando STONE_WEBHOOK_SECRET.
  void payload;
  return Boolean(assinatura);
}
