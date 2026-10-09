import { useCallback, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ultimaVezVisto } from "@/lib/chatVisto";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";
import { ResponsiveContent } from "@/components/ResponsiveContent";

interface Conversa {
  solicitacaoId: string;
  categoria: string;
  status: string;
  outraParte: { id: string; nome: string; fotoUrl: string | null } | null;
  ultimaMensagem: string | null;
  ultimaMensagemEm: string;
  ultimaMensagemDe: string | null;
}

function formatarData(iso: string): string {
  const data = new Date(iso);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  return mesmoDia
    ? data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface Props {
  onAbrirConversa: (id: string, nome?: string, categoria?: string) => void;
  // Usado no layout lado-a-lado de telas largas (ChatSplitView): destaca
  // a conversa aberta no painel ao lado e evita o SafeAreaView duplicado
  // (o próprio split view já cuida da borda superior).
  conversaAtivaId?: string;
  embutido?: boolean;
}

export function ChatListScreen({ onAbrirConversa, conversaAtivaId, embutido }: Props) {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [naoLidas, setNaoLidas] = useState<Record<string, boolean>>({});
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      apiFetch<Conversa[]>("/chat/conversas")
        .then(async (lista) => {
          setConversas(lista);
          const status: Record<string, boolean> = {};
          await Promise.all(
            lista.map(async (c) => {
              // Mensagem própria nunca conta como "não lida"; sem
              // remetente registrado (conversa sem mensagens) também não.
              if (!c.ultimaMensagemDe || c.ultimaMensagemDe === usuario?.id) return;
              const visto = await ultimaVezVisto(c.solicitacaoId);
              status[c.solicitacaoId] = !visto || new Date(c.ultimaMensagemEm) > new Date(visto);
            })
          );
          setNaoLidas(status);
        })
        .catch(() => setConversas([]))
        .finally(() => setCarregando(false));
    }, [usuario?.id])
  );

  const conteudo = (
    <>
      {!embutido && <Text style={styles.titulo}>Chat</Text>}

      <FlatList
          data={conversas}
          keyExtractor={(item) => item.solicitacaoId}
          contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.md }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, conversaAtivaId === item.solicitacaoId && styles.cardAtivo]}
              onPress={() => onAbrirConversa(item.solicitacaoId, item.outraParte?.nome, item.categoria)}
            >
              <View style={styles.linhaPrincipal}>
                {item.outraParte?.fotoUrl ? (
                  <Image source={{ uri: item.outraParte.fotoUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackTexto}>{(item.outraParte?.nome ?? "?")[0]?.toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={styles.linha}>
                    <View style={styles.nomeLinha}>
                      {naoLidas[item.solicitacaoId] && <View style={styles.pontoNaoLido} />}
                      <Text style={styles.nome}>{item.outraParte?.nome ?? "Usuário"}</Text>
                    </View>
                    <Text style={styles.data}>{formatarData(item.ultimaMensagemEm)}</Text>
                  </View>
                  <Text style={styles.badge}>{item.categoria}</Text>
                  <Text style={[styles.preview, naoLidas[item.solicitacaoId] && styles.previewNaoLida]} numberOfLines={1}>
                    {item.ultimaMensagem ?? "Nenhuma mensagem ainda — diga olá!"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !carregando ? (
              <Text style={styles.vazio}>
                As conversas de cada solicitação aparecem aqui assim que um autônomo aceitar o pedido.
              </Text>
            ) : null
          }
      />
    </>
  );

  if (embutido) {
    return <View style={styles.containerEmbutido}>{conteudo}</View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>{conteudo}</ResponsiveContent>
    </SafeAreaView>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  containerEmbutido: { flex: 1, paddingHorizontal: spacing.sm },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md },
  cardAtivo: { backgroundColor: colors.primaryLight },
  linhaPrincipal: { flexDirection: "row", gap: spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: radius.full },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackTexto: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  linha: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  nomeLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  pontoNaoLido: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.secondary },
  nome: { fontWeight: "700", color: colors.ink, fontSize: 15 },
  data: { color: colors.muted, fontSize: 12 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.secondaryLight,
    color: colors.secondary,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  preview: { color: colors.muted, marginTop: spacing.xs, fontSize: 13 },
  previewNaoLida: { color: colors.ink, fontWeight: "700" },
  vazio: { color: colors.muted, textAlign: "center", marginTop: spacing.lg },
  });
}
