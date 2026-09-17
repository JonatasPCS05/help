import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { colors, radius, spacing } from "@/theme";
import { labelStatus, proximoPasso } from "@/lib/status";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { DateTimePickerField } from "@/components/DateTimePickerField";
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
  id: string;
  valorTotal: string | number;
  taxaPlataformaPercentual: string | number;
  taxaPlataformaValor: string | number;
  valorAutonomo: string | number;
  status: "retido" | "liberado" | "reembolsado" | "cancelado";
  criadoEm: string;
}

interface SolicitacaoDetalhe {
  id: string;
  clienteId: string;
  autonomoId: string | null;
  descricao: string;
  disponibilidade: { dia: string; periodo: string }[];
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

const LABEL_PERIODO: Record<string, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };
const HORA_PADRAO_PERIODO: Record<string, number> = { manha: 9, tarde: 14, noite: 19 };

function formatarDisponibilidade(disponibilidade: { dia: string; periodo: string }[]): string | null {
  const primeira = disponibilidade?.[0];
  if (!primeira) return null;
  const [ano, mes, dia] = primeira.dia.split("-").map(Number);
  const dataFormatada = new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
  return `${dataFormatada} (${LABEL_PERIODO[primeira.periodo] ?? primeira.periodo})`;
}

function preferenciaJaPassou(disponibilidade: { dia: string; periodo: string }[]): boolean {
  const primeira = disponibilidade?.[0];
  if (!primeira) return false;
  const [ano, mes, dia] = primeira.dia.split("-").map(Number);
  const hora = HORA_PADRAO_PERIODO[primeira.periodo] ?? 9;
  return new Date(ano, mes - 1, dia, hora, 0, 0).getTime() <= Date.now();
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
  const [mostrarReagendar, setMostrarReagendar] = useState(false);
  const [mostrarComprovante, setMostrarComprovante] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    apiFetch<SolicitacaoDetalhe>(`/solicitacoes/${solicitacaoId}`)
      .then(setSolicitacao)
      .catch((e) => setErro(e instanceof ApiClientError ? e.message : "Não foi possível carregar"))
      .finally(() => setCarregando(false));
  }, [solicitacaoId]);

  useFocusEffect(carregar);

  // Pré-preenche a data (e um horário padrão pro período escolhido) com a
  // preferência que o cliente já informou ao criar o pedido, pra o
  // autônomo não ter que redigitar — mas continua ajustável.
  useEffect(() => {
    const preferencia = solicitacao?.disponibilidade?.[0];
    if (preferencia && dataVisita === null) {
      const [ano, mes, dia] = preferencia.dia.split("-").map(Number);
      const hora = HORA_PADRAO_PERIODO[preferencia.periodo] ?? 9;
      const candidata = new Date(ano, mes - 1, dia, hora, 0, 0);
      // Se a preferência do cliente já passou (pedido ficou parado antes de
      // ser aceito, por exemplo), não faz sentido pré-preencher com uma
      // data no passado — deixa em branco pra forçar escolher uma nova.
      if (candidata.getTime() > Date.now()) {
        setDataVisita(candidata);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitacao]);

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
  const visitaPassada =
    !!solicitacao.visitaTecnica &&
    !solicitacao.visitaTecnica.realizada &&
    new Date(solicitacao.visitaTecnica.dataHora).getTime() <= Date.now();
  const preferenciaPassada =
    solicitacao.status === "aceito_pelo_autonomo" && preferenciaJaPassou(solicitacao.disponibilidade);

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
    if (dataVisita.getTime() <= Date.now()) {
      setErro("A data e hora da visita precisam ser no futuro");
      return;
    }
    await executar(async () => {
      await apiFetch(`/solicitacoes/${solicitacaoId}/visita`, {
        method: "POST",
        body: JSON.stringify({ dataHora: dataVisita.toISOString() }),
      });
      setMostrarReagendar(false);
    });
  }

  async function marcarVisitaRealizada() {
    await executar(() => apiFetch(`/solicitacoes/${solicitacaoId}/visita/realizar`, { method: "POST" }));
  }

  async function iniciarServico() {
    await executar(() => apiFetch(`/solicitacoes/${solicitacaoId}/iniciar`, { method: "POST" }));
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

          {proximoPasso(solicitacao.status, souAutonomo ? "autonomo" : "cliente") && (
            <Text style={styles.proximoPasso}>
              → {proximoPasso(solicitacao.status, souAutonomo ? "autonomo" : "cliente")}
            </Text>
          )}

          <Text style={styles.descricao}>{solicitacao.descricao}</Text>
          {formatarDisponibilidade(solicitacao.disponibilidade) && (
            <Text style={styles.preferenciaData}>
              📅 Preferência do cliente: {formatarDisponibilidade(solicitacao.disponibilidade)}
            </Text>
          )}
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
              {preferenciaPassada ? (
                <Text style={styles.aviso}>
                  A data preferida pelo cliente não está mais disponível. Escolha um novo dia e horário.
                </Text>
              ) : (
                formatarDisponibilidade(solicitacao.disponibilidade) && (
                  <Text style={styles.cardMuted}>
                    Cliente prefere: {formatarDisponibilidade(solicitacao.disponibilidade)} — já vem preenchido
                    abaixo, mas você pode ajustar.
                  </Text>
                )
              )}
              <DateTimePickerField value={dataVisita} onChange={setDataVisita} minimumDate={new Date()} style={styles.input} />
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

              {visitaPassada && <Text style={styles.aviso}>A data da visita já passou.</Text>}

              {souAutonomo && !solicitacao.visitaTecnica.realizada && (
                <>
                  <TouchableOpacity style={styles.botaoSecundario} onPress={marcarVisitaRealizada} disabled={processando}>
                    <Text style={styles.botaoSecundarioTexto}>Marcar visita como realizada</Text>
                  </TouchableOpacity>
                  {!mostrarReagendar ? (
                    <TouchableOpacity onPress={() => setMostrarReagendar(true)} style={styles.linkSecundario}>
                      <Text style={styles.linkSecundarioTexto}>Propor outro horário</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.reagendarBloco}>
                      <DateTimePickerField value={dataVisita} onChange={setDataVisita} minimumDate={new Date()} style={styles.input} />
                      <View style={styles.botoesLinha}>
                        <TouchableOpacity style={styles.botaoSecundario} onPress={() => setMostrarReagendar(false)}>
                          <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.botaoPrimario, styles.flex1]} onPress={agendarVisita} disabled={processando}>
                          <Text style={styles.botaoPrimarioTexto}>Confirmar novo horário</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
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
              <Text style={styles.cardMuted}>
                Você paga o valor total combinado no orçamento (a taxa da plataforma já está incluída, não é
                cobrada à parte). O valor fica retido com segurança e só é liberado pro autônomo depois que os
                dois confirmarem que o serviço foi concluído.
              </Text>
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
              <Text style={styles.cardMuted}>
                {solicitacao.pagamento.status === "liberado"
                  ? "Repasse ao autônomo já liberado."
                  : "O repasse ao autônomo acontece automaticamente assim que cliente e autônomo confirmarem a conclusão do serviço."}
              </Text>

              <TouchableOpacity onPress={() => setMostrarComprovante((v) => !v)} style={styles.linkSecundario}>
                <Text style={styles.linkSecundarioTexto}>{mostrarComprovante ? "Ocultar comprovante" : "Ver comprovante"}</Text>
              </TouchableOpacity>

              {mostrarComprovante && (
                <View style={styles.comprovante}>
                  <Text style={styles.comprovanteTitulo}>Comprovante de Pagamento</Text>
                  <Text style={styles.comprovanteLinha}>Pedido: {solicitacao.categoria.nome} · {solicitacaoId}</Text>
                  <Text style={styles.comprovanteLinha}>
                    Data do pagamento: {new Date(solicitacao.pagamento.criadoEm).toLocaleString("pt-BR")}
                  </Text>
                  <Text style={styles.comprovanteLinha}>Cliente: {solicitacao.cliente.nome}</Text>
                  {solicitacao.autonomo && <Text style={styles.comprovanteLinha}>Autônomo: {solicitacao.autonomo.nome}</Text>}
                  <View style={styles.comprovanteDivisor} />
                  <Text style={styles.comprovanteLinha}>Valor total: R$ {Number(solicitacao.pagamento.valorTotal).toFixed(2)}</Text>
                  <Text style={styles.comprovanteLinha}>
                    Taxa da plataforma ({Number(solicitacao.pagamento.taxaPlataformaPercentual).toFixed(0)}%): R${" "}
                    {Number(solicitacao.pagamento.taxaPlataformaValor).toFixed(2)}
                  </Text>
                  <Text style={styles.comprovanteLinha}>
                    Valor repassado ao autônomo: R$ {Number(solicitacao.pagamento.valorAutonomo).toFixed(2)}
                  </Text>
                  <Text style={styles.comprovanteLinha}>Status: {LABEL_STATUS_PAGAMENTO[solicitacao.pagamento.status]}</Text>
                </View>
              )}
            </View>
          )}

          {/* Iniciar serviço — autônomo, depois do pagamento */}
          {souAutonomo && solicitacao.status === "pago" && (
            <View style={styles.card}>
              <Text style={styles.cardTitulo}>Iniciar serviço</Text>
              <Text style={styles.cardMuted}>Pagamento recebido. Marque quando começar a execução do serviço.</Text>
              <TouchableOpacity style={styles.botaoPrimario} onPress={iniciarServico} disabled={processando}>
                <Text style={styles.botaoPrimarioTexto}>Iniciar serviço</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Conclusão mútua */}
          {solicitacao.status === "em_andamento" && (
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
              <View style={styles.estrelas} accessibilityRole="adjustable" accessibilityLabel={`Nota: ${nota} de 5 estrelas`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setNota(n)}
                    accessibilityRole="button"
                    accessibilityLabel={`${n} estrela${n > 1 ? "s" : ""}`}
                    accessibilityState={{ selected: n === nota }}
                  >
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
  proximoPasso: { color: colors.primary, fontWeight: "700", fontSize: 13, marginTop: spacing.sm },
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
  preferenciaData: { color: colors.muted, fontSize: 13, marginTop: spacing.xs },
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
  aviso: { color: "#C62828", fontSize: 12, fontWeight: "600", marginTop: spacing.xs, marginBottom: spacing.xs },
  linkSecundario: { marginTop: spacing.sm, alignItems: "center" },
  linkSecundarioTexto: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  reagendarBloco: { marginTop: spacing.sm },
  comprovante: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
  },
  comprovanteTitulo: { fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  comprovanteLinha: { color: colors.ink, fontSize: 13, marginBottom: 2 },
  comprovanteDivisor: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  cancelarBloco: { marginTop: spacing.sm, marginBottom: spacing.xl },
  linkCancelar: { color: "#C62828", fontWeight: "600", textAlign: "center" },
});
