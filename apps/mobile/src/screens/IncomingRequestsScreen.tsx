import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, ApiClientError } from "@/lib/api";
import { colors, radius, spacing } from "@/theme";
import { ResponsiveContent } from "@/components/ResponsiveContent";

interface SolicitacaoDisponivel {
  id: string;
  descricao: string;
  categoria: { nome: string };
  endereco: { bairro: string; cidade: string };
  cliente: { nome: string; avaliacaoMediaCliente: string | number };
}

export function IncomingRequestsScreen() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoDisponivel[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    apiFetch<SolicitacaoDisponivel[]>("/solicitacoes/disponiveis")
      .then(setSolicitacoes)
      .catch((e) => setErro(e instanceof ApiClientError ? e.message : "Não foi possível carregar"))
      .finally(() => setCarregando(false));
  }, []);

  // Recarrega sempre que a aba ganha foco, pra pegar novas solicitações
  // sem precisar sair e entrar no app.
  useFocusEffect(carregar);

  async function responder(id: string, aceitar: boolean) {
    setProcessandoId(id);
    try {
      await apiFetch(`/solicitacoes/${id}/${aceitar ? "aceitar" : "recusar"}`, { method: "POST" });
      setSolicitacoes((atual) => atual.filter((s) => s.id !== id));
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível responder");
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <Text style={styles.titulo}>Solicitações Recebidas</Text>
        <Text style={styles.subtitulo}>
          {carregando
            ? "Carregando..."
            : `Você tem ${solicitacoes.length} pedido(s) de serviço próximos a você.`}
        </Text>

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <FlatList
          data={solicitacoes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.md }}
          onRefresh={carregar}
          refreshing={carregando}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.clienteNome}>{item.cliente.nome}</Text>
                <View style={styles.nota}>
                  <Ionicons name="star" size={13} color={colors.secondary} />
                  <Text style={styles.notaTexto}>{Number(item.cliente.avaliacaoMediaCliente).toFixed(1)}</Text>
                </View>
              </View>
              <Text style={styles.badge}>{item.categoria.nome}</Text>
              <Text style={styles.local}>
                {item.endereco.bairro} - {item.endereco.cidade}
              </Text>
              <Text style={styles.descricao} numberOfLines={3}>
                {item.descricao}
              </Text>

              <View style={styles.botoes}>
                <TouchableOpacity
                  style={styles.botaoRecusar}
                  onPress={() => responder(item.id, false)}
                  disabled={processandoId === item.id}
                >
                  <Text style={styles.botaoRecusarTexto}>Recusar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.botaoAceitar}
                  onPress={() => responder(item.id, true)}
                  disabled={processandoId === item.id}
                >
                  <Text style={styles.botaoAceitarTexto}>Aceitar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !carregando ? <Text style={styles.vazio}>Nenhuma solicitação disponível no momento.</Text> : null
          }
        />
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.md },
  subtitulo: { color: colors.muted, marginTop: spacing.xs },
  erro: { color: "#C62828", marginTop: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clienteNome: { fontWeight: "700", color: colors.ink },
  nota: { flexDirection: "row", alignItems: "center", gap: 4 },
  notaTexto: { color: colors.secondary, fontWeight: "600" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  local: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  descricao: { color: colors.ink, marginTop: spacing.sm },
  botoes: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  botaoRecusar: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  botaoRecusarTexto: { color: colors.ink, fontWeight: "600" },
  botaoAceitar: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: "center" },
  botaoAceitarTexto: { color: colors.white, fontWeight: "700" },
  vazio: { color: colors.muted, textAlign: "center", marginTop: spacing.lg },
});
