import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";
import { labelStatus, proximoPasso } from "@/lib/status";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { RelogioAnimado } from "@/components/RelogioAnimado";
import { AvaliacaoBadge } from "@/components/AvaliacaoBadge";
import { AvaliacoesModal } from "@/components/AvaliacoesModal";
import { OrderProgressStepper } from "@/components/OrderProgressStepper";
import { ICONE_POR_CATEGORIA, ICONE_CATEGORIA_PADRAO } from "@/lib/categoriaIcones";

interface Solicitacao {
  id: string;
  descricao: string;
  status: string;
  categoria: { nome: string };
  criadoEm: string;
  disponibilidade: { dia: string; periodo: string }[];
  endereco: { bairro: string; cidade: string };
  cliente: { id: string; nome: string; avaliacaoMediaCliente: number | string } | null;
  autonomo: { id: string; nome: string; avaliacaoMediaAutonomo: number | string } | null;
  visitaTecnica: { dataHora: string } | null;
}

// Rótulos alinhados com o vocabulário de status (ver lib/status.ts) — o
// nome da aba nunca deve soar contraditório com o status individual do
// card dentro dela (ex.: card "Aceito" numa aba "Em aberto" confundia).
const ABAS_CLIENTE = [
  { chave: "aberto", label: "Aguardando início", status: ["aguardando_autonomo", "aceito_pelo_autonomo", "visita_agendada", "orcamento_enviado"] },
  { chave: "andamento", label: "Em execução", status: ["orcamento_aceito", "pago", "em_andamento"] },
  { chave: "concluido", label: "Concluído", status: ["concluido"] },
  { chave: "cancelado", label: "Cancelado", status: ["cancelado", "recusado_pelo_autonomo", "orcamento_recusado", "em_disputa", "expirado"] },
];

const ABAS_AUTONOMO = [
  { chave: "aberto", label: "Aceitos", status: ["aceito_pelo_autonomo", "visita_agendada", "orcamento_enviado", "orcamento_aceito"] },
  { chave: "andamento", label: "Em execução", status: ["pago", "em_andamento"] },
  { chave: "concluido", label: "Concluído", status: ["concluido"] },
  { chave: "cancelado", label: "Cancelado", status: ["cancelado", "em_disputa"] },
];

const LABEL_PERIODO: Record<string, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatarPreferencia(disponibilidade: { dia: string; periodo: string }[]): string | null {
  const primeira = disponibilidade?.[0];
  if (!primeira) return null;
  const [ano, mes, dia] = primeira.dia.split("-").map(Number);
  const dataFormatada = new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
  return `${dataFormatada} (${LABEL_PERIODO[primeira.periodo] ?? primeira.periodo})`;
}

interface Props {
  papel?: "cliente" | "autonomo";
  onAbrirSolicitacao: (id: string) => void;
}

export function OrdersScreen({ papel = "cliente", onAbrirSolicitacao }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const abas = papel === "autonomo" ? ABAS_AUTONOMO : ABAS_CLIENTE;
  const [abaAtiva, setAbaAtiva] = useState(abas[0]);
  const [avaliacaoAberta, setAvaliacaoAberta] = useState<{ id: string; nome: string; nota: number } | null>(null);

  // Recarrega sempre que a aba ganha foco (ex.: voltando de "Nova Solicitação"
  // ou depois de aceitar um pedido), não só na primeira montagem — evita ter
  // que sair e entrar no app pra ver a lista atualizada.
  useFocusEffect(
    useCallback(() => {
      apiFetch<Solicitacao[]>(`/solicitacoes/me?papel=${papel}`).then(setSolicitacoes).catch(() => setSolicitacoes([]));
    }, [papel])
  );

  const filtradas = solicitacoes.filter((s) => abaAtiva.status.includes(s.status));

  // Pra desenhar o stepper em cada card, precisamos saber em qual das 4
  // abas o status atual dele cai -- não só o da aba selecionada no momento.
  function abaDoStatus(status: string) {
    return abas.find((a) => a.status.includes(status)) ?? abas[0];
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <Text style={styles.titulo}>{papel === "autonomo" ? "Meus Trabalhos" : "Meus Pedidos"}</Text>

        <View style={styles.statsGrade}>
          {abas.map((aba) => {
            const quantidade = solicitacoes.filter((s) => aba.status.includes(s.status)).length;
            const ativa = abaAtiva.chave === aba.chave;
            return (
              <TouchableOpacity
                key={aba.chave}
                style={[styles.statCard, ativa && styles.statCardAtivo]}
                onPress={() => setAbaAtiva(aba)}
              >
                <Text style={[styles.statNumero, ativa && styles.statNumeroAtivo]}>{quantidade}</Text>
                <Text style={[styles.statLabel, ativa && styles.statLabelAtivo]}>{aba.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={filtradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.md }}
          renderItem={({ item }) => {
            // Do ponto de vista do cliente mostramos quem aceitou (autônomo);
            // do ponto de vista do autônomo mostramos quem é o cliente.
            const outraParte = papel === "autonomo" ? item.cliente : item.autonomo;
            const passo = proximoPasso(item.status, papel);
            const preferencia = formatarPreferencia(item.disponibilidade);
            // Visual do "próximo passo" troca de texto por ícone nos dois
            // estados de espera mais comuns (sugestão do professor): um
            // relógio pulsando enquanto a visita não é agendada, e um
            // calendário depois que ela é. Quando o serviço já foi
            // concluído, a linha vira a nota do outro lado — tocar abre o
            // histórico completo de avaliações dele.
            const notaOutraParte = outraParte
              ? Number(papel === "autonomo" ? (outraParte as { avaliacaoMediaCliente: number | string }).avaliacaoMediaCliente : (outraParte as { avaliacaoMediaAutonomo: number | string }).avaliacaoMediaAutonomo)
              : 0;
            return (
              <TouchableOpacity style={styles.card} onPress={() => onAbrirSolicitacao(item.id)}>
                <View style={styles.cardHeader}>
                  <View style={styles.cabecalhoEsquerda}>
                    <View style={styles.thumbnail}>
                      <Ionicons
                        name={ICONE_POR_CATEGORIA[item.categoria.nome] ?? ICONE_CATEGORIA_PADRAO}
                        size={16}
                        color={colors.primary}
                      />
                    </View>
                    <Text style={styles.badge}>{item.categoria.nome}</Text>
                  </View>
                  <Text style={styles.statusTexto}>{labelStatus(item.status)}</Text>
                </View>
                <Text style={styles.descricao} numberOfLines={2}>
                  {item.descricao}
                </Text>
                {item.endereco && (
                  <Text style={styles.infoExtra}>
                    {item.endereco.bairro} · {item.endereco.cidade}
                  </Text>
                )}
                {outraParte && (
                  <Text style={styles.infoExtra}>
                    {papel === "autonomo" ? "Cliente" : "Autônomo"}: {outraParte.nome}
                  </Text>
                )}
                {item.visitaTecnica ? (
                  <View style={styles.infoExtraLinha}>
                    <Ionicons name="calendar-outline" size={13} color={colors.muted} />
                    <Text style={[styles.infoExtra, styles.semMargemTopo]}>Visita agendada: {formatarDataHora(item.visitaTecnica.dataHora)}</Text>
                  </View>
                ) : (
                  preferencia && <Text style={styles.infoExtra}>Preferência do cliente: {preferencia}</Text>
                )}

                <View style={styles.stepperContainer}>
                  <OrderProgressStepper etapas={abas} chaveAtiva={abaDoStatus(item.status).chave} />
                </View>

                {item.status === "concluido" && outraParte ? (
                  <TouchableOpacity
                    style={styles.proximoPassoLinha}
                    onPress={() => setAvaliacaoAberta({ id: outraParte.id, nome: outraParte.nome, nota: notaOutraParte })}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver avaliações de ${outraParte.nome}`}
                  >
                    <AvaliacaoBadge nota={notaOutraParte} />
                  </TouchableOpacity>
                ) : (
                  passo && (
                    <View style={[styles.proximoPassoLinha, styles.proximoPassoComIcone]}>
                      {item.status === "aceito_pelo_autonomo" && <RelogioAnimado color={colors.primary} />}
                      {item.status === "visita_agendada" && <Ionicons name="calendar" size={15} color={colors.primary} />}
                      <Text style={styles.proximoPassoTexto}>→ {passo}</Text>
                    </View>
                  )
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhum pedido nesta categoria.</Text>}
        />
      </ResponsiveContent>

      {avaliacaoAberta && (
        <AvaliacoesModal
          visivel
          usuarioId={avaliacaoAberta.id}
          nome={avaliacaoAberta.nome}
          notaMedia={avaliacaoAberta.nota}
          onFechar={() => setAvaliacaoAberta(null)}
        />
      )}
    </SafeAreaView>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.md, marginBottom: spacing.md },
  statsGrade: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  statCard: { flex: 1, minWidth: 130, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.sm, alignItems: "center" },
  statCardAtivo: { backgroundColor: colors.primaryLight },
  statNumero: { fontSize: 20, fontWeight: "700", color: colors.ink },
  statNumeroAtivo: { color: colors.primary },
  statLabel: { fontSize: 11, color: colors.muted, textAlign: "center", marginTop: 2 },
  statLabelAtivo: { color: colors.primaryDark, fontWeight: "600" },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  cabecalhoEsquerda: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  thumbnail: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
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
  stepperContainer: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: 2 },
  statusTexto: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  descricao: { color: colors.ink },
  infoExtra: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  infoExtraLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.xs },
  semMargemTopo: { marginTop: 0 },
  proximoPassoLinha: { marginTop: spacing.xs },
  proximoPassoComIcone: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  proximoPassoTexto: { color: colors.primary, fontSize: 12.5, fontWeight: "700" },
  vazio: { color: colors.muted, textAlign: "center", marginTop: spacing.lg },
  });
}
