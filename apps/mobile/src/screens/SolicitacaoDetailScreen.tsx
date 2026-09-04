import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { colors, radius, spacing } from "@/theme";
import { labelStatus } from "@/lib/status";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { DatePickerField } from "@/components/DatePickerField";
import { confirmarAcao } from "@/lib/confirm";
import { AvaliacaoBadge } from "@/components/AvaliacaoBadge";
import { COR_ESTRELA } from "@/lib/rating";

interface Pessoa {
  id: string;
  nome: string;
  avaliacaoMediaCliente?: string | number;
  avaliacaoMediaAutonomo?: string | number;
}

interface Orcamento {
  id: string;
  valor: string | number;
  descricao: string | null;
  status: "pendente" | "aceito" | "recusado";
}

interface Pagamento {
  valorTotal: string | number;
  taxaPlataformaValor: string | number;
  valorAutonomo: string | number;
  status: "retido" | "liberado" | "reembolsado" | "cancelado";
}

interface SolicitacaoDetalhe {
  id: string;
  clienteId: string;
  autonomoId: string | null;
  descricao: string;
  status: string;
  concluidoClienteEm: string | null;
  concluidoAutonomoEm: string | null;
  categoria: { nome: string };
  endereco: { rua: string; numero: string | null; bairro: string; cidade: string; estado: string };
  visitaTecnica: { dataHora: string; realizada: boolean; observacoes: string | null } | null;
  orcamentos: Orcamento[];
  pagamento: Pagamento | null;
  cliente: Pessoa;
  autonomo: Pessoa | null;
}

const LABEL_STATUS_PAGAMENTO: Record<string, string> = {
  retido: "Retido (liberado após conclusão)",
  liberado: "Liberado",
  reembolsado: "Reembolsado",
  cancelado: "Cancelado",
};

export function SolicitacaoDetailScreen({ solicitacaoId, onVoltar }: { solicitacaoId: string; onVoltar: () => void }) {
  const { usuario } = useAuth();
  const [solicitacao, setSolicitacao] = useState<SolicitacaoDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);

  const [dataVisita, setDataVisita] = useState<Date | null>(null);
  const [valorOrcamento, setValorOrcamento] = useState("");
  const [descricaoOrcamento, setDescricaoOrcamento] = useState("");
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [mostrarCancelamento, setMostrarCancelamento] = useState(false);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [avaliado, setAvaliado] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    apiFetch<SolicitacaoDetalhe>(`/solicitacoes/${solicitacaoId}`)
      .then(setSolicitacao)
      .catch((e) => setErro(e instanceof ApiClientError ? e.message : "Não foi possível carregar"))
      .finally(() => setCarregando(false));
  }, [solicitacaoId]);

  useFocusEffect(carregar);

  if (carregando || !solicitacao) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centro}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const souCliente = usuario?.id === solicitacao.clienteId;
  const souAutonomo = usuario?.id === solicitacao.autonomoId;
  const orcamentoPendente = solicitacao.orcamentos.find((o) => o.status === "pendente");
  const orcamentoAceito = solicitacao.orcamentos.find((o) => o.status === "aceito");
  const jaConcluiMinhaParte = souCliente ? !!solicitacao.concluidoClienteEm : !!solicitacao.concluidoAutonomoEm;
  const podeCancelar = !["em_andamento", "concluido", "cancelado"].includes(solicitacao.status);

  async function executar(acao: () => Promise<unknown>) {
    setErro(null);
    setProcessando(true);
    try {
      await acao();
      carregar();
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível concluir a ação");
    } finally {
      setProcessando(false);
    }
  }

  async function agendarVisita() {
    if (!dataVisita) {
      setErro("Escolha a data da visita");
      return;
    }
    await executar(() =>
      apiFetch(`/solicitacoes/${solicitacaoId}/visita`, {
        method: "POST",
        body: JSON.stringify({ dataHora: dataVisita.toISOString() }),
      })
    );
  }

  async function marcarVisitaRealizada() {
    await executar(() => apiFetch(`/solicitacoes/${solicitacaoId}/visita/realizar`, { method: "POST" }));
  }

  async function enviarOrcamento() {
    const valor = Number(valorOrcamento.replace(",", "."));
    if (!valor || valor <= 0) {
      setErro("Informe um valor válido pro orçamento");
      return;
    }
    await executar(async () => {
      await apiFetch("/orcamentos", {
        method: "POST",
        body: JSON.stringify({ solicitacaoId, valor, descricao: descricaoOrcamento || undefined }),
      });
      setValorOrcamento("");
      setDescricaoOrcamento("");
    });
  }

  async function responderOrcamento(aceitar: boolean) {
    if (!orcamentoPendente) return;
    await executar(() =>
      apiFetch(`/orcamentos/${orcamentoPendente.id}/resposta`, {
        method: "POST",
        body: JSON.stringify({ aceitar }),
      })
    );
  }

  async function pagar() {
    await executar(() => apiFetch("/pagamentos", { method: "POST", body: JSON.stringify({ solicitacaoId }) }));
  }

  async function marcarConcluido() {
    await executar(() => apiFetch(`/solicitacoes/${solicitacaoId}/concluir`, { method: "POST" }));
  }

  async function enviarAvaliacao() {
    await executar(async () => {
      try {
        await apiFetch("/avaliacoes", {
          method: "POST",
          body: JSON.stringify({ solicitacaoId, nota, comentario: comentario || undefined }),
        });
      } catch (e) {
        if (e instanceof ApiClientError && e.message.toLowerCase().includes("já avaliou")) {
          setAvaliado(true);
          return;
        }
        throw e;
      }
      setAvaliado(true);
    });
  }

  function cancelar() {
    if (!motivoCancelamento.trim()) {
      setErro("Descreva o motivo do cancelamento");
      return;
    }
    confirmarAcao("Cancelar solicitação", "Tem certeza? Essa ação não pode ser desfeita.", () => {
      executar(async () => {
        await apiFetch("/cancelamentos", {
          method: "POST",
          body: JSON.stringify({ solicitacaoId, motivo: motivoCancelamento }),
        });
        onVoltar();
      });
    });
  }

  const outraParte = souAutonomo ? solicitacao.cliente : solicitacao.autonomo;
  const notaOutraParte = souAutonomo
    ? outraParte?.avaliacaoMediaCliente
    : outraParte?.avaliacaoMediaAutonomo;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <ScrollView>
          <TouchableOpacity onPress={onVoltar} style={styles.voltar}>
            <Text style={styles.voltarTexto}>← Voltar</Text>
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <Text style={styles.badge}>{solicitacao.categoria.nome}</Text>
            <Text style={styles.statusTexto}>{labelStatus(solicitacao.status)}</Text>
          </View>

          <Text style={styles.descricao}>{solicitacao.descricao}</Text>
          <Text style={styles.endereco}>
            {solicitacao.endereco.rua}
            {solicitacao.endereco.numero ? `, ${solicitacao.endereco.numero}` : ""} — {solicitacao.endereco.bairro},{" "}
            {solicitacao.endereco.cidade}/{solicitacao.endereco.estado}
          </Text>

          {outraParte && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>{souAutonomo ? "Cliente" : "Autônomo"}</Text>
              <Text style={styles.cardTexto}>{outraParte.nome}</Text>
              {notaOutraParte !== undefined && <AvaliacaoBadge nota={notaOutraParte} />}
            </View>
          )}

          {/* Agendar visita — autônomo, logo após aceitar */}
          {souAutonomo && solicitacao.status === "aceito_pelo_autonomo" && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Agendar visita técnica</Text>
              <DatePickerField value={dataVisita} onChange={setDataVisita} minimumDate={new Date()} style={styles.input} />
              <TouchableOpacity style={styles.botaoPrimario} onPress={agendarVisita} disabled={processando}>
                <Text style={styles.botaoPrimarioTexto}>Confirmar agendamento</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Info da visita já agendada */}
          {solicitacao.visitaTecnica && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Visita técnica</Text>
              <Text style={styles.cardTexto}>
                {new Date(solicitacao.visitaTecnica.dataHora).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              <Text style={styles.cardMuted}>{solicitacao.visitaTecnica.realizada ? "Realizada" : "Aguardando"}</Text>
              {souAutonomo && !solicitacao.visitaTecnica.realizada && (
                <TouchableOpacity style={styles.botaoSecundario} onPress={marcarVisitaRealizada} disabled={processando}>
                  <Text style={styles.botaoSecundarioTexto}>Marcar visita como realizada</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Criar orçamento — autônomo, após visita agendada */}
          {souAutonomo && solicitacao.status === "visita_agendada" && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Enviar orçamento</Text>
              <TextInput
                style={styles.input}
                value={valorOrcamento}
                onChangeText={setValorOrcamento}
                placeholder="Valor (R$)"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.input, styles.textarea]}
                value={descricaoOrcamento}
                onChangeText={setDescricaoOrcamento}
                placeholder="Detalhes do orçamento (opcional)"
                placeholderTextColor={colors.muted}
                multiline
              />
              <TouchableOpacity style={styles.botaoPrimario} onPress={enviarOrcamento} disabled={processando}>
                <Text style={styles.botaoPrimarioTexto}>Enviar orçamento</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Orçamento pendente — cliente aceita/recusa */}
          {souCliente && orcamentoPendente && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Orçamento recebido</Text>
              <Text style={styles.valorDestaque}>R$ {Number(orcamentoPendente.valor).toFixed(2)}</Text>
              {orcamentoPendente.descricao && <Text style={styles.cardTexto}>{orcamentoPendente.descricao}</Text>}
              <View style={styles.botoesLinha}>
                <TouchableOpacity
                  style={styles.botaoSecundario}
                  onPress={() => responderOrcamento(false)}
                  disabled={processando}
                >
                  <Text style={styles.botaoSecundarioTexto}>Recusar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.botaoPrimario, styles.flex1]}
                  onPress={() => responderOrcamento(true)}
                  disabled={processando}
                >
                  <Text style={styles.botaoPrimarioTexto}>Aceitar orçamento</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Pagamento — cliente paga após aceitar orçamento */}
          {souCliente && solicitacao.status === "orcamento_aceito" && !solicitacao.pagamento && orcamentoAceito && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Pagamento</Text>
              <Text style={styles.valorDestaque}>R$ {Number(orcamentoAceito.valor).toFixed(2)}</Text>
              <Text style={styles.cardMuted}>Fica retido até a conclusão do serviço.</Text>
              <TouchableOpacity style={styles.botaoPrimario} onPress={pagar} disabled={processando}>
                <Text style={styles.botaoPrimarioTexto}>Pagar agora</Text>
              </TouchableOpacity>
            </View>
          )}

          {solicitacao.pagamento && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Pagamento</Text>
              <Text style={styles.cardTexto}>
                Total: R$ {Number(solicitacao.pagamento.valorTotal).toFixed(2)} · Taxa: R${" "}
                {Number(solicitacao.pagamento.taxaPlataformaValor).toFixed(2)}
              </Text>
              <Text style={styles.cardMuted}>{LABEL_STATUS_PAGAMENTO[solicitacao.pagamento.status]}</Text>
            </View>
          )}

          {/* Conclusão mútua */}
          {(solicitacao.status === "pago" || solicitacao.status === "em_andamento") && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Conclusão do serviço</Text>
              <Text style={styles.cardMuted}>
                {jaConcluiMinhaParte
                  ? "Você já confirmou. Aguardando a outra parte confirmar também."
                  : "Confirme quando o serviço estiver concluído."}
              </Text>
              {!jaConcluiMinhaParte && (
                <TouchableOpacity style={styles.botaoPrimario} onPress={marcarConcluido} disabled={processando}>
                  <Text style={styles.botaoPrimarioTexto}>Marcar como concluído</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Avaliação após conclusão */}
          {solicitacao.status === "concluido" && !avaliado && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Avaliar {souAutonomo ? "cliente" : "autônomo"}</Text>
              <View style={styles.estrelas}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity key={n} onPress={() => setNota(n)}>
                    <Text style={[styles.estrela, n <= nota && styles.estrelaAtiva]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={comentario}
                onChangeText={setComentario}
                placeholder="Comentário (opcional)"
                placeholderTextColor={colors.muted}
                multiline
              />
              <TouchableOpacity style={styles.botaoPrimario} onPress={enviarAvaliacao} disabled={processando}>
                <Text style={styles.botaoPrimarioTexto}>Enviar avaliação</Text>
              </TouchableOpacity>
            </View>
          )}
          {solicitacao.status === "concluido" && avaliado && (
            <Text style={styles.cardMuted}>Avaliação enviada. Obrigado!</Text>
          )}

          {erro && <Text style={styles.erro}>{erro}</Text>}

          {/* Cancelamento */}
          {podeCancelar && (
            <View style={styles.cancelarBloco}>
              {!mostrarCancelamento ? (
                <TouchableOpacity onPress={() => setMostrarCancelamento(true)}>
                  <Text style={styles.linkCancelar}>Cancelar solicitação</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.cardTitulo}>Cancelar solicitação</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={motivoCancelamento}
                    onChangeText={setMotivoCancelamento}
                    placeholder="Motivo do cancelamento"
                    placeholderTextColor={colors.muted}
                    multiline
                  />
                  <TouchableOpacity style={styles.botaoDestrutivo} onPress={cancelar} disabled={processando}>
                    <Text style={styles.botaoPrimarioTexto}>Confirmar cancelamento</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  voltar: { marginTop: spacing.md, marginBottom: spacing.sm },
  voltarTexto: { color: colors.primary, fontWeight: "700" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.secondaryLight,
    color: colors.secondary,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusTexto: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  descricao: { color: colors.ink, fontSize: 15, marginTop: spacing.sm },
  endereco: { color: colors.muted, fontSize: 12, marginTop: spacing.xs, marginBottom: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  cardTitulo: { fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  cardTexto: { color: colors.ink },
  cardMuted: { color: colors.muted, fontSize: 12, marginTop: 2 },
  valorDestaque: { fontSize: 20, fontWeight: "700", color: colors.primary, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.canvas,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.ink,
  },
  textarea: { minHeight: 70, textAlignVertical: "top" },
  botoesLinha: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  flex1: { flex: 1 },
  botaoPrimario: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: "center" },
  botaoPrimarioTexto: { color: colors.white, fontWeight: "700" },
  botaoSecundario: {
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  botaoSecundarioTexto: { color: colors.ink, fontWeight: "600" },
  botaoDestrutivo: { backgroundColor: "#C62828", borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: "center" },
  estrelas: { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.sm },
  estrela: { fontSize: 26, color: colors.border },
  estrelaAtiva: { color: COR_ESTRELA },
  erro: { color: "#C62828", marginBottom: spacing.sm },
  cancelarBloco: { marginTop: spacing.sm, marginBottom: spacing.xl },
  linkCancelar: { color: "#C62828", fontWeight: "600", textAlign: "center" },
});
