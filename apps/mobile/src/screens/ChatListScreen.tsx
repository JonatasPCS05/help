import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ultimaVezVisto } from "@/lib/chatVisto";
import { colors, radius, spacing } from "@/theme";
import { ResponsiveContent } from "@/components/ResponsiveContent";

interface Conversa {
  solicitacaoId: string;
  categoria: string;
  status: string;
  outraParte: { id: string; nome: string } | null;
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
}

export function ChatListScreen({ onAbrirConversa }: Props) {
  const { usuario } = useAuth();
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <Text style={styles.titulo}>Chat</Text>

        <FlatList
          data={conversas}
          keyExtractor={(item) => item.solicitacaoId}
          contentContainerStyle={{ gap: spacing.md, paddingVertical: spacing.md }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => onAbrirConversa(item.solicitacaoId, item.outraParte?.nome, item.categoria)}
            >
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
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.md },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md },
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
