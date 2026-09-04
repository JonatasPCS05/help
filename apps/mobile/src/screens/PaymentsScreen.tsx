import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { labelStatusPagamento } from "@/lib/status";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { colors, radius, spacing } from "@/theme";

interface Pagamento {
  valorTotal: string | number;
  valorAutonomo: string | number;
  status: string;
}

interface Solicitacao {
  id: string;
  criadoEm: string;
  categoria: { nome: string };
  pagamento: Pagamento | null;
}

interface ItemPagamento {
  id: string;
  papel: "cliente" | "autonomo";
  categoria: string;
  criadoEm: string;
  valor: number;
  status: string;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PaymentsScreen({ onVoltar, onAbrirSolicitacao }: { onVoltar: () => void; onAbrirSolicitacao: (id: string) => void }) {
  const { usuario } = useAuth();
  const [itens, setItens] = useState<ItemPagamento[]>([]);
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
          const paraItem = (s: Solicitacao, papel: "cliente" | "autonomo"): ItemPagamento | null => {
            if (!s.pagamento) return null;
            const valor = Number(papel === "cliente" ? s.pagamento.valorTotal : s.pagamento.valorAutonomo);
            return { id: s.id, papel, categoria: s.categoria.nome, criadoEm: s.criadoEm, valor, status: s.pagamento.status };
          };

          const combinados = [
            ...comoCliente.map((s) => paraItem(s, "cliente")),
            ...(comoAutonomo ?? []).map((s) => paraItem(s, "autonomo")),
          ]
            .filter((item): item is ItemPagamento => item !== null)
            .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

          setItens(combinados);
        })
        .catch(() => setItens([]))
        .finally(() => setCarregando(false));
    }, [usuario?.isAutonomo])
  );

  const totalGasto = itens.filter((i) => i.papel === "cliente").reduce((soma, i) => soma + i.valor, 0);
  const totalRecebido = itens.filter((i) => i.papel === "autonomo").reduce((soma, i) => soma + i.valor, 0);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <TouchableOpacity onPress={onVoltar}>
          <Text style={styles.voltar}>{"< Voltar"}</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Pagamentos</Text>

        <View style={styles.resumoLinha}>
          <View style={styles.resumoCard}>
            <Text style={styles.resumoLabel}>Total gasto</Text>
            <Text style={styles.resumoValor}>{formatarMoeda(totalGasto)}</Text>
          </View>
          {usuario?.isAutonomo && (
            <View style={styles.resumoCard}>
              <Text style={styles.resumoLabel}>Total recebido</Text>
              <Text style={styles.resumoValor}>{formatarMoeda(totalRecebido)}</Text>
            </View>
          )}
        </View>

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
                  <Text style={styles.badge}>{item.categoria}</Text>
                  <Text style={styles.valor}>{formatarMoeda(item.valor)}</Text>
                </View>
                <View style={styles.cardRodape}>
                  <Text style={styles.papel}>{item.papel === "autonomo" ? "Recebido como autônomo" : "Pago como cliente"}</Text>
                  <Text style={styles.data}>{new Date(item.criadoEm).toLocaleDateString("pt-BR")}</Text>
                </View>
                <Text style={styles.status}>{labelStatusPagamento(item.status)}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.vazio}>Nenhum pagamento ainda.</Text>}
          />
        )}
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  voltar: { color: colors.primary, fontWeight: "600", marginTop: spacing.md },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.md },
  resumoLinha: { flexDirection: "row", gap: spacing.md },
  resumoCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md },
  resumoLabel: { color: colors.muted, fontSize: 12 },
  resumoValor: { color: colors.primary, fontSize: 18, fontWeight: "700", marginTop: 2 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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
  valor: { color: colors.ink, fontWeight: "700" },
  cardRodape: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.sm },
  papel: { color: colors.muted, fontSize: 12 },
  data: { color: colors.muted, fontSize: 12 },
  status: { color: colors.primary, fontSize: 12, fontWeight: "700", marginTop: spacing.xs },
  vazio: { color: colors.muted, textAlign: "center", marginTop: spacing.lg },
});
