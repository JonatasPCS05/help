import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { marcarComoVisto } from "@/lib/chatVisto";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { colors, radius, spacing } from "@/theme";

interface Mensagem {
  id: string;
  remetenteId: string;
  mensagem: string;
  criadoEm: string;
}

const INTERVALO_ATUALIZACAO_MS = 4000;

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  solicitacaoId: string;
  nomeOutraParte?: string;
  categoria?: string;
  onVoltar: () => void;
}

export function ChatScreen({ solicitacaoId, nomeOutraParte, categoria, onVoltar }: Props) {
  const { usuario } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<FlatList>(null);

  const carregar = useCallback(() => {
    apiFetch<Mensagem[]>(`/chat/${solicitacaoId}/mensagens`)
      .then(setMensagens)
      .catch(() => {})
      .finally(() => setCarregando(false));
    // Enquanto a conversa está aberta e sendo recarregada, ela conta como
    // vista — é assim que o indicador de não lida na lista some ao entrar.
    marcarComoVisto(solicitacaoId);
  }, [solicitacaoId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
      const intervalo = setInterval(carregar, INTERVALO_ATUALIZACAO_MS);
      return () => clearInterval(intervalo);
    }, [carregar])
  );

  useEffect(() => {
    if (mensagens.length > 0) {
      requestAnimationFrame(() => listaRef.current?.scrollToEnd({ animated: false }));
    }
  }, [mensagens.length]);

  async function enviar() {
    const conteudo = texto.trim();
    if (!conteudo) return;

    setTexto("");
    setEnviando(true);
    try {
      const nova = await apiFetch<Mensagem>(`/chat/${solicitacaoId}/mensagens`, {
        method: "POST",
        body: JSON.stringify({ mensagem: conteudo }),
      });
      setMensagens((atual) => [...atual, nova]);
    } catch {
      setTexto(conteudo);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent style={styles.conteudo}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onVoltar}>
            <Text style={styles.voltar}>{"< Voltar"}</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerNome}>{nomeOutraParte ?? "Conversa"}</Text>
            {categoria && <Text style={styles.headerCategoria}>{categoria} · sobre este pedido</Text>}
          </View>
        </View>

        {carregando ? (
          <View style={styles.centro}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={listaRef}
            data={mensagens}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md, flexGrow: 1 }}
            onContentSizeChange={() => listaRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => {
              const minhaMensagem = item.remetenteId === usuario?.id;
              return (
                <View style={[styles.bolha, minhaMensagem ? styles.bolhaMinha : styles.bolhaOutro]}>
                  <Text style={[styles.bolhaTexto, minhaMensagem && styles.bolhaTextoMinha]}>{item.mensagem}</Text>
                  <Text style={[styles.bolhaHora, minhaMensagem && styles.bolhaHoraMinha]}>{formatarHora(item.criadoEm)}</Text>
                </View>
              );
            }}
            ListEmptyComponent={<Text style={styles.vazio}>Nenhuma mensagem ainda — diga olá!</Text>}
          />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.inputLinha}>
            <TextInput
              style={styles.input}
              value={texto}
              onChangeText={setTexto}
              placeholder="Escreva uma mensagem..."
              placeholderTextColor={colors.muted}
              multiline
              onSubmitEditing={enviar}
              accessibilityLabel="Mensagem"
            />
            <TouchableOpacity
              style={styles.botaoEnviar}
              onPress={enviar}
              disabled={enviando || !texto.trim()}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem"
            >
              <Ionicons name="send" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  conteudo: { paddingHorizontal: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  voltar: { color: colors.primary, fontWeight: "600" },
  headerNome: { fontSize: 16, fontWeight: "700", color: colors.ink },
  headerCategoria: { fontSize: 12, color: colors.muted, marginTop: 1 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  vazio: { color: colors.muted, textAlign: "center", marginTop: spacing.lg },
  bolha: { maxWidth: "78%", borderRadius: radius.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  bolhaOutro: { backgroundColor: colors.white, alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  bolhaMinha: { backgroundColor: colors.primary, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bolhaTexto: { color: colors.ink, fontSize: 14 },
  bolhaTextoMinha: { color: colors.white },
  bolhaHora: { color: colors.muted, fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  bolhaHoraMinha: { color: "rgba(255,255,255,0.75)" },
  inputLinha: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    maxHeight: 100,
  },
  botaoEnviar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
