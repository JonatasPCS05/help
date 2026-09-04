import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { labelStatus } from "@/lib/status";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { colors, radius, spacing } from "@/theme";

interface Solicitacao {
  id: string;
  descricao: string;
  status: string;
  criadoEm: string;
  categoria: { nome: string };
}

interface ItemHistorico extends Solicitacao {
  papel: "cliente" | "autonomo";
}

const STATUS_FINALIZADOS = ["concluido", "cancelado", "recusado_pelo_autonomo", "orcamento_recusado", "em_disputa"];

export function HistoryScreen({ onVoltar, onAbrirSolicitacao }: { onVoltar: () => void; onAbrirSolicitacao: (id: string) => void }) {
  const { usuario } = useAuth();
  const [itens, setItens] = useState<ItemHistorico[]>([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);
      const buscas = [apiFetch<Solicitacao[]>("/solicitacoes/me?papel=cliente")];
      if (usuario?.isAutonomo) {
        buscas.push(apiFetch<Solicitacao[]>("/solicitacoes/me?papel=autonomo"));
      }

      Promise.all(buscas)
        .then(([comoCliente, comoAutonomo]) => {
          const marcados: ItemHistorico[] = [
            ...comoCliente.map((s) => ({ ...s, papel: "cliente" as const })),
            ...(comoAutonomo ?? []).map((s) => ({ ...s, papel: "autonomo" as const })),
          ];
          const finalizados = marcados
            .filter((s) => STATUS_FINALIZADOS.includes(s.status))
            .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
          setItens(finalizados);
        })
        .catch(() => setItens([]))
        .finally(() => setCarregando(false));
    }, [usuario?.isAutonomo])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <TouchableOpacity onPress={onVoltar}>
          <Text style={styles.voltar}>{"< Voltar"}</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Histórico</Text>

        {carregando ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : (
          <FlatList
            data={itens}
            keyExtractor={(item) => `${item.papel}-${item.id}`}
            contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.md }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => onAbrirSolicitacao(item.id)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.badge}>{item.categoria.nome}</Text>
                  <Text style={styles.papel}>{item.papel === "autonomo" ? "Como autônomo" : "Como cliente"}</Text>
                </View>
                <Text style={styles.descricao} numberOfLines={2}>
                  {item.descricao}
                </Text>
                <View style={styles.cardRodape}>
                  <Text style={styles.status}>{labelStatus(item.status)}</Text>
                  <Text style={styles.data}>{new Date(item.criadoEm).toLocaleDateString("pt-BR")}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.vazio}>Nenhum pedido finalizado ainda.</Text>}
          />
        )}
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  voltar: { color: colors.primary, fontWeight: "600", marginTop: spacing.md },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.sm },
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
  papel: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  descricao: { color: colors.ink },
  cardRodape: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  status: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  data: { color: colors.muted, fontSize: 12 },
  vazio: { color: colors.muted, textAlign: "center", marginTop: spacing.lg },
});
