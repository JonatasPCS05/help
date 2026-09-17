import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";
import { colors, radius, spacing } from "@/theme";
import { labelStatus, proximoPasso } from "@/lib/status";
import { ResponsiveContent } from "@/components/ResponsiveContent";

interface Solicitacao {
  id: string;
  descricao: string;
  status: string;
  categoria: { nome: string };
  criadoEm: string;
  disponibilidade: { dia: string; periodo: string }[];
  endereco: { bairro: string; cidade: string };
  cliente: { nome: string } | null;
  autonomo: { nome: string } | null;
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
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const abas = papel === "autonomo" ? ABAS_AUTONOMO : ABAS_CLIENTE;
  const [abaAtiva, setAbaAtiva] = useState(abas[0]);

  // Recarrega sempre que a aba ganha foco (ex.: voltando de "Nova Solicitação"
  // ou depois de aceitar um pedido), não só na primeira montagem — evita ter
  // que sair e entrar no app pra ver a lista atualizada.
  useFocusEffect(
    useCallback(() => {
      apiFetch<Solicitacao[]>(`/solicitacoes/me?papel=${papel}`).then(setSolicitacoes).catch(() => setSolicitacoes([]));
    }, [papel])
  );

  const filtradas = solicitacoes.filter((s) => abaAtiva.status.includes(s.status));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <Text style={styles.titulo}>{papel === "autonomo" ? "Meus Trabalhos" : "Meus Pedidos"}</Text>

        <View style={styles.abas}>
          {abas.map((aba) => (
            <TouchableOpacity key={aba.chave} onPress={() => setAbaAtiva(aba)}>
              <Text style={[styles.aba, abaAtiva.chave === aba.chave && styles.abaAtiva]}>{aba.label}</Text>
            </TouchableOpacity>
          ))}
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
            return (
              <TouchableOpacity style={styles.card} onPress={() => onAbrirSolicitacao(item.id)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.badge}>{item.categoria.nome}</Text>
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
                  <Text style={styles.infoExtra}>Visita agendada: {formatarDataHora(item.visitaTecnica.dataHora)}</Text>
                ) : (
                  preferencia && <Text style={styles.infoExtra}>Preferência do cliente: {preferencia}</Text>
                )}
                {passo && (
                  <View style={styles.proximoPassoLinha}>
                    <Text style={styles.proximoPassoTexto}>→ {passo}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.vazio}>Nenhum pedido nesta categoria.</Text>}
        />
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.md },
  abas: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md, flexWrap: "wrap" },
  aba: { color: colors.muted, fontWeight: "600", paddingBottom: spacing.xs },
  abaAtiva: { color: colors.primary, borderBottomWidth: 2, borderBottomColor: colors.primary },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
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
  descricao: { color: colors.ink },
  infoExtra: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  proximoPassoLinha: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  proximoPassoTexto: { color: colors.primary, fontSize: 12.5, fontWeight: "700" },
  vazio: { color: colors.muted, textAlign: "center", marginTop: spacing.lg },
});
