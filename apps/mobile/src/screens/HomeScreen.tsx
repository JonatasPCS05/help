import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { ModoSwitcher } from "@/components/ModoSwitcher";
import { apiFetch } from "@/lib/api";
import { colors, radius, spacing } from "@/theme";

interface Categoria {
  id: string;
  nome: string;
}

interface SolicitacaoAutonomo {
  status: string;
  categoria: { nome: string };
  cliente: { nome: string } | null;
  visitaTecnica: { dataHora: string; realizada: boolean } | null;
}

const STATUS_ATIVOS = ["aceito_pelo_autonomo", "visita_agendada", "orcamento_enviado", "orcamento_aceito", "pago", "em_andamento"];

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function HomeCliente({ onNovaSolicitacao }: { onNovaSolicitacao: () => void }) {
  const { usuario } = useAuth();
  const { isWide } = useResponsive();
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    apiFetch<Categoria[]>("/categorias").then(setCategorias).catch(() => setCategorias([]));
  }, []);

  return (
    <>
      <Text style={styles.saudacao}>Olá, {usuario?.nome?.split(" ")[0] ?? ""}!</Text>
      <Text style={styles.subtitulo}>O que você precisa hoje?</Text>
      <ModoSwitcher />

      <TouchableOpacity style={styles.cta} onPress={onNovaSolicitacao}>
        <Text style={styles.ctaTexto}>+ Solicitar Serviço</Text>
      </TouchableOpacity>

      <Text style={styles.secaoTitulo}>Categorias</Text>
      <FlatList
        data={categorias}
        keyExtractor={(item) => item.id}
        key={isWide ? "wide" : "narrow"}
        numColumns={isWide ? 4 : 2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.lg }}
        renderItem={({ item }) => (
          <View style={styles.categoriaCard}>
            <View style={styles.categoriaIcone} />
            <Text style={styles.categoriaNome}>{item.nome}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.subtitulo}>Carregando categorias...</Text>}
      />
    </>
  );
}

function HomeAutonomo() {
  const { usuario } = useAuth();
  const [carregando, setCarregando] = useState(true);
  const [disponiveis, setDisponiveis] = useState(0);
  const [trabalhos, setTrabalhos] = useState<SolicitacaoAutonomo[]>([]);

  useFocusEffect(
    useCallback(() => {
      setCarregando(true);
      Promise.all([
        apiFetch<unknown[]>("/solicitacoes/disponiveis").catch(() => []),
        apiFetch<SolicitacaoAutonomo[]>("/solicitacoes/me?papel=autonomo").catch(() => []),
      ])
        .then(([disponiveisResp, meusTrabalhos]) => {
          setDisponiveis(disponiveisResp.length);
          setTrabalhos(meusTrabalhos.filter((s) => STATUS_ATIVOS.includes(s.status)));
        })
        .finally(() => setCarregando(false));
    }, [])
  );

  const proximaVisita = trabalhos
    .filter((t) => t.visitaTecnica && !t.visitaTecnica.realizada)
    .map((t) => ({ ...t, visitaTecnica: t.visitaTecnica! }))
    .sort((a, b) => new Date(a.visitaTecnica.dataHora).getTime() - new Date(b.visitaTecnica.dataHora).getTime())[0];

  const online = usuario?.perfilAutonomo?.online ?? false;

  return (
    <>
      <Text style={styles.saudacao}>Olá, {usuario?.nome?.split(" ")[0] ?? ""}!</Text>
      <Text style={styles.subtitulo}>Modo Autônomo</Text>
      <ModoSwitcher />

      <View style={[styles.statusCard, online ? styles.statusOnline : styles.statusOffline]}>
        <View style={[styles.statusPonto, { backgroundColor: online ? colors.primary : colors.muted }]} />
        <Text style={styles.statusTexto}>{online ? "Você está online — recebendo pedidos" : "Você está offline"}</Text>
      </View>

      {carregando ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <>
          <View style={styles.statsLinha}>
            <View style={styles.statCard}>
              <Text style={styles.statNumero}>{disponiveis}</Text>
              <Text style={styles.statLabel}>{disponiveis === 1 ? "pedido disponível" : "pedidos disponíveis"}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumero}>{trabalhos.length}</Text>
              <Text style={styles.statLabel}>{trabalhos.length === 1 ? "trabalho em andamento" : "trabalhos em andamento"}</Text>
            </View>
          </View>

          <Text style={styles.secaoTitulo}>Próxima visita</Text>
          {proximaVisita ? (
            <View style={styles.card}>
              <Text style={styles.badge}>{proximaVisita.categoria.nome}</Text>
              <Text style={styles.cardTexto}>{proximaVisita.cliente?.nome}</Text>
              <Text style={styles.cardMuted}>{formatarDataHora(proximaVisita.visitaTecnica.dataHora)}</Text>
            </View>
          ) : (
            <Text style={styles.vazio}>Nenhuma visita agendada no momento.</Text>
          )}
        </>
      )}
    </>
  );
}

export function HomeScreen({ onNovaSolicitacao }: { onNovaSolicitacao: () => void }) {
  const { modo } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        {modo === "autonomo" ? <HomeAutonomo /> : <HomeCliente onNovaSolicitacao={onNovaSolicitacao} />}
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  saudacao: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.md },
  subtitulo: { color: colors.muted, marginTop: spacing.xs },
  cta: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  ctaTexto: { color: colors.white, fontWeight: "700", fontSize: 15 },
  secaoTitulo: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm, marginTop: spacing.lg },
  categoriaCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },
  categoriaIcone: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  categoriaNome: { color: colors.ink, fontWeight: "600" },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  statusOnline: { backgroundColor: colors.primaryLight },
  statusOffline: { backgroundColor: colors.white },
  statusPonto: { width: 10, height: 10, borderRadius: radius.full },
  statusTexto: { color: colors.ink, fontWeight: "600", fontSize: 13 },
  statsLinha: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, alignItems: "center" },
  statNumero: { fontSize: 26, fontWeight: "700", color: colors.primary },
  statLabel: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 2 },
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
  cardTexto: { color: colors.ink, fontWeight: "600" },
  cardMuted: { color: colors.muted, fontSize: 12, marginTop: 2 },
  vazio: { color: colors.muted, fontSize: 13 },
});
