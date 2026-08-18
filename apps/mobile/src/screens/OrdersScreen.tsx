import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";
import { colors, radius, spacing } from "@/theme";

interface Solicitacao {
  id: string;
  descricao: string;
  status: string;
  categoria: { nome: string };
  criadoEm: string;
}

const ABAS = [
  { chave: "aberto", label: "Em aberto", status: ["aguardando_autonomo", "aceito_pelo_autonomo", "visita_agendada", "orcamento_enviado"] },
  { chave: "andamento", label: "Em andamento", status: ["orcamento_aceito", "pago", "em_andamento"] },
  { chave: "concluido", label: "Concluído", status: ["concluido"] },
  { chave: "cancelado", label: "Cancelado", status: ["cancelado", "recusado_pelo_autonomo", "orcamento_recusado", "em_disputa"] },
];

export function OrdersScreen() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [abaAtiva, setAbaAtiva] = useState(ABAS[0]);

  // Recarrega sempre que a aba ganha foco (ex.: voltando de "Nova Solicitação"),
  // não só na primeira montagem — evita ter que sair e entrar no app pra ver
  // um pedido recém-criado.
  useFocusEffect(
    useCallback(() => {
      apiFetch<Solicitacao[]>("/solicitacoes/me?papel=cliente").then(setSolicitacoes).catch(() => setSolicitacoes([]));
    }, [])
  );

  const filtradas = solicitacoes.filter((s) => abaAtiva.status.includes(s.status));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.titulo}>Meus Pedidos</Text>

      <View style={styles.abas}>
        {ABAS.map((aba) => (
          <TouchableOpacity key={aba.chave} onPress={() => setAbaAtiva(aba)}>
            <Text style={[styles.aba, abaAtiva.chave === aba.chave && styles.abaAtiva]}>{aba.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtradas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.badge}>{item.categoria.nome}</Text>
            <Text style={styles.descricao} numberOfLines={2}>
              {item.descricao}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.vazio}>Nenhum pedido nesta categoria.</Text>}
      />
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
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.secondaryLight,
    color: colors.secondary,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
  },
  descricao: { color: colors.ink },
  vazio: { color: colors.muted, textAlign: "center", marginTop: spacing.lg },
});
