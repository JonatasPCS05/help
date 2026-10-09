import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { ModoSwitcher } from "@/components/ModoSwitcher";
import { StatCard } from "@/components/StatCard";
import { Carousel } from "@/components/Carousel";
import { ProfessionalDirectoryCard, type ProfissionalResumo } from "@/components/ProfessionalDirectoryCard";
import { AvaliacaoBadge } from "@/components/AvaliacaoBadge";
import { ICONE_POR_CATEGORIA, ICONE_CATEGORIA_PADRAO } from "@/lib/categoriaIcones";
import { labelStatus, proximoPasso } from "@/lib/status";
import { apiFetch } from "@/lib/api";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

interface Categoria {
  id: string;
  nome: string;
}

interface SolicitacaoCliente {
  id: string;
  status: string;
  categoria: { nome: string };
  autonomo: { nome: string } | null;
}

interface Conversa {
  solicitacaoId: string;
  categoria: string;
  outraParte: { id: string; nome: string } | null;
  ultimaMensagem: string | null;
  ultimaMensagemEm: string;
}

interface Favorito {
  id: string;
  autonomo: {
    id: string;
    usuario: { id: string; nome: string; fotoUrl: string | null; avaliacaoMediaAutonomo: number | string };
    categorias: { categoria: { nome: string } }[];
  };
}

const STATUS_ABERTOS_CLIENTE = ["aguardando_autonomo", "aceito_pelo_autonomo", "visita_agendada", "orcamento_enviado"];

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

interface HomeClienteProps {
  onNovaSolicitacao: () => void;
  onAbrirPedidos?: () => void;
  onAbrirChat?: () => void;
  onBuscarProfissionais?: () => void;
  onVerPerfilProfissional?: (autonomoId: string) => void;
}

function HomeCliente({ onNovaSolicitacao, onAbrirPedidos, onAbrirChat, onBuscarProfissionais, onVerPerfilProfissional }: HomeClienteProps) {
  const { usuario } = useAuth();
  const { isWide } = useResponsive();
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pedidos, setPedidos] = useState<SolicitacaoCliente[]>([]);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [destaques, setDestaques] = useState<ProfissionalResumo[]>([]);

  useEffect(() => {
    apiFetch<Categoria[]>("/categorias").then(setCategorias).catch(() => setCategorias([]));
    apiFetch<ProfissionalResumo[]>("/publico/autonomos?ordenar=avaliacao")
      .then((lista) => setDestaques(lista.slice(0, 6)))
      .catch(() => setDestaques([]));
  }, []);

  useFocusEffect(
    useCallback(() => {
      apiFetch<SolicitacaoCliente[]>("/solicitacoes/me").then(setPedidos).catch(() => setPedidos([]));
      apiFetch<Conversa[]>("/chat/conversas").then(setConversas).catch(() => setConversas([]));
      apiFetch<Favorito[]>("/favoritos").then(setFavoritos).catch(() => setFavoritos([]));
    }, [])
  );

  const pedidosAbertos = pedidos.filter((p) => STATUS_ABERTOS_CLIENTE.includes(p.status));
  const favoritosIds = favoritos.map((f) => f.autonomo.id);

  async function alternarFavorito(autonomoId: string) {
    const favoritado = favoritosIds.includes(autonomoId);
    try {
      await apiFetch(`/favoritos/${autonomoId}`, { method: favoritado ? "DELETE" : "POST" });
      apiFetch<Favorito[]>("/favoritos").then(setFavoritos).catch(() => {});
    } catch {
      // silencioso -- favoritar é conveniência, não ação crítica
    }
  }

  return (
    <>
      <Text style={styles.saudacao}>Olá, {usuario?.nome?.split(" ")[0] ?? ""}!</Text>
      <Text style={styles.subtitulo}>O que você precisa hoje?</Text>
      <ModoSwitcher />

      <TouchableOpacity style={styles.cta} onPress={onNovaSolicitacao}>
        <Text style={styles.ctaTexto}>+ Solicitar Serviço</Text>
      </TouchableOpacity>

      <View style={styles.statsGrade}>
        <StatCard icone="receipt-outline" numero={pedidosAbertos.length} label="Pedidos em aberto" onPress={onAbrirPedidos} />
        <StatCard icone="chatbubble-ellipses-outline" numero={conversas.length} label="Conversas" onPress={onAbrirChat} />
        <StatCard icone="heart-outline" numero={favoritos.length} label="Favoritos" />
        <StatCard
          icone="star-outline"
          numero={Number(usuario?.avaliacaoMediaCliente ?? 0).toFixed(1)}
          label="Sua avaliação"
        />
      </View>

      {pedidosAbertos.length > 0 && (
        <>
          <View style={styles.secaoCabecalho}>
            <Text style={styles.secaoTitulo}>Pedidos em andamento</Text>
            {onAbrirPedidos && (
              <TouchableOpacity onPress={onAbrirPedidos}>
                <Text style={styles.verTodos}>Ver todos</Text>
              </TouchableOpacity>
            )}
          </View>
          {pedidosAbertos.slice(0, 2).map((p) => (
            <TouchableOpacity key={p.id} style={styles.previewCard} onPress={onAbrirPedidos}>
              <View style={styles.previewIcone}>
                <Ionicons name={ICONE_POR_CATEGORIA[p.categoria.nome] ?? ICONE_CATEGORIA_PADRAO} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitulo}>{p.categoria.nome}</Text>
                <Text style={styles.previewTexto}>{proximoPasso(p.status, "cliente") ?? labelStatus(p.status)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {conversas.length > 0 && (
        <>
          <View style={styles.secaoCabecalho}>
            <Text style={styles.secaoTitulo}>Mensagens recentes</Text>
            {onAbrirChat && (
              <TouchableOpacity onPress={onAbrirChat}>
                <Text style={styles.verTodos}>Ver todas</Text>
              </TouchableOpacity>
            )}
          </View>
          {conversas.slice(0, 2).map((c) => (
            <TouchableOpacity key={c.solicitacaoId} style={styles.previewCard} onPress={onAbrirChat}>
              <View style={styles.previewIcone}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitulo}>{c.outraParte?.nome ?? c.categoria}</Text>
                {c.ultimaMensagem && (
                  <Text style={styles.previewTexto} numberOfLines={1}>
                    {c.ultimaMensagem}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Text style={styles.secaoTitulo}>Categorias de serviços</Text>
      <FlatList
        data={categorias}
        keyExtractor={(item) => item.id}
        key={isWide ? "wide" : "narrow"}
        numColumns={isWide ? 4 : 2}
        scrollEnabled={false}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ gap: spacing.md, marginBottom: spacing.lg }}
        renderItem={({ item }) => (
          <View style={styles.categoriaCard}>
            <View style={styles.categoriaIcone}>
              <Ionicons name={ICONE_POR_CATEGORIA[item.nome] ?? ICONE_CATEGORIA_PADRAO} size={20} color={colors.primary} />
            </View>
            <Text style={styles.categoriaNome}>{item.nome}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.subtitulo}>Carregando categorias...</Text>}
      />

      {destaques.length > 0 && onVerPerfilProfissional && (
        <>
          <View style={styles.secaoCabecalho}>
            <Text style={styles.secaoTitulo}>Profissionais em destaque</Text>
            {onBuscarProfissionais && (
              <TouchableOpacity onPress={onBuscarProfissionais}>
                <Text style={styles.verTodos}>Ver mais</Text>
              </TouchableOpacity>
            )}
          </View>
          <Carousel>
            {destaques.map((p) => (
              <ProfessionalDirectoryCard
                key={p.id}
                profissional={p}
                largura={220}
                onPress={() => onVerPerfilProfissional(p.id)}
                onSolicitarOrcamento={onNovaSolicitacao}
                favoritado={favoritosIds.includes(p.id)}
                onAlternarFavorito={() => alternarFavorito(p.id)}
              />
            ))}
          </Carousel>
        </>
      )}

      {isWide && favoritos.length > 0 && onVerPerfilProfissional && (
        <>
          <Text style={styles.secaoTitulo}>Seus favoritos</Text>
          <View style={styles.favoritosGrade}>
            {favoritos.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={styles.favoritoItem}
                onPress={() => onVerPerfilProfissional(f.autonomo.id)}
              >
                <Text style={styles.previewTitulo}>{f.autonomo.usuario.nome}</Text>
                <Text style={styles.previewTexto}>{f.autonomo.categorias[0]?.categoria.nome}</Text>
                <AvaliacaoBadge nota={f.autonomo.usuario.avaliacaoMediaAutonomo} tamanhoEstrela={12} tamanhoTexto={11} />
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </>
  );
}

function HomeAutonomo() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);
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

interface HomeScreenProps {
  onNovaSolicitacao: () => void;
  onAbrirPedidos?: () => void;
  onAbrirChat?: () => void;
  onBuscarProfissionais?: () => void;
  onVerPerfilProfissional?: (autonomoId: string) => void;
}

export function HomeScreen({
  onNovaSolicitacao,
  onAbrirPedidos,
  onAbrirChat,
  onBuscarProfissionais,
  onVerPerfilProfissional,
}: HomeScreenProps) {
  const { modo } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ResponsiveContent>
          {modo === "autonomo" ? (
            <HomeAutonomo />
          ) : (
            <HomeCliente
              onNovaSolicitacao={onNovaSolicitacao}
              onAbrirPedidos={onAbrirPedidos}
              onAbrirChat={onAbrirChat}
              onBuscarProfissionais={onBuscarProfissionais}
              onVerPerfilProfissional={onVerPerfilProfissional}
            />
          )}
        </ResponsiveContent>
      </ScrollView>
    </SafeAreaView>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  saudacao: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.md },
  subtitulo: { color: colors.muted, marginTop: spacing.xs },
  cta: {
    backgroundColor: colors.primary,
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
    alignItems: "center",
    justifyContent: "center",
  },
  categoriaNome: { color: colors.ink, fontWeight: "600", fontSize: 12.5, textAlign: "center" },
  statsGrade: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  secaoCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.sm },
  verTodos: { color: colors.primary, fontWeight: "700", fontSize: 12.5 },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  previewIcone: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitulo: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  previewTexto: { color: colors.muted, fontSize: 12, marginTop: 1 },
  favoritosGrade: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  favoritoItem: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.sm,
    minWidth: 160,
    gap: 2,
  },
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
}
