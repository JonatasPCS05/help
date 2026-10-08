import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch, ApiClientError } from "@/lib/api";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { AvaliacaoBadge } from "@/components/AvaliacaoBadge";

interface SolicitacaoDisponivel {
  id: string;
  descricao: string;
  categoria: { nome: string };
  distanciaKm: number;
  cliente: { nome: string; avaliacaoMediaCliente: string | number };
}

function formatarDistancia(km: number): string {
  if (km < 1) return "a menos de 1 km";
  return `a aproximadamente ${km.toFixed(1).replace(".0", "")} km`;
}

export function IncomingRequestsScreen({ onAceito }: { onAceito: (id: string) => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const { usuario } = useAuth();
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

  // Recarrega também assim que as categorias atendidas mudam (ex.: o
  // autônomo acabou de adicionar uma categoria no Perfil) — sem isso, em
  // telas largas (desktop) onde essa aba pode ficar montada sem nunca
  // perder o foco, a lista só atualizaria num refresh manual.
  const categoriasAtendidas = usuario?.perfilAutonomo?.categorias.map((c) => c.categoria.id).join(",");
  useEffect(() => {
    if (categoriasAtendidas !== undefined) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriasAtendidas]);

  async function responder(id: string, aceitar: boolean) {
    setProcessandoId(id);
    try {
      await apiFetch(`/solicitacoes/${id}/${aceitar ? "aceitar" : "recusar"}`, { method: "POST" });
      setSolicitacoes((atual) => atual.filter((s) => s.id !== id));
      // Depois de aceitar, vai direto pra tela onde o autônomo agenda a
      // visita — em vez de deixar ele procurar manualmente em "Trabalhos".
      if (aceitar) {
        onAceito(id);
      }
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
            : solicitacoes.length === 0
              ? "Nenhum pedido próximo no momento."
              : solicitacoes.length === 1
                ? "1 pedido próximo de você."
                : `${solicitacoes.length} pedidos próximos de você.`}
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
                <AvaliacaoBadge nota={item.cliente.avaliacaoMediaCliente} tamanhoEstrela={13} />
              </View>
              <Text style={styles.badge}>{item.categoria.nome}</Text>
              <Text style={styles.local}>{formatarDistancia(item.distanciaKm)}</Text>
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
            !carregando ? (
              <Text style={styles.vazio}>
                Nenhum pedido disponível no momento. Confira se você está online e se sua localização e categorias
                estão atualizadas.
              </Text>
            ) : null
          }
        />
      </ResponsiveContent>
    </SafeAreaView>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.md },
  subtitulo: { color: colors.muted, marginTop: spacing.xs },
  erro: { color: "#C62828", marginTop: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  clienteNome: { fontWeight: "700", color: colors.ink },
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
}
