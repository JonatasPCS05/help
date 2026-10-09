import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ChatListScreen } from "@/screens/ChatListScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

// Layout lado-a-lado (lista + conversa aberta ao mesmo tempo) pra telas
// largas -- no mobile, ChatStack usa navegação normal (uma tela por vez).
export function ChatSplitView() {
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [selecionada, setSelecionada] = useState<{ id: string; nome?: string; categoria?: string } | null>(null);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.lista}>
        <Text style={styles.titulo}>Conversas</Text>
        <Text style={styles.subtitulo}>Converse com os profissionais sobre seus serviços e tire suas dúvidas.</Text>
        <ChatListScreen
          embutido
          conversaAtivaId={selecionada?.id}
          onAbrirConversa={(id, nome, categoria) => setSelecionada({ id, nome, categoria })}
        />
      </View>
      <View style={styles.detalhe}>
        {selecionada ? (
          <ChatScreen
            key={selecionada.id}
            embutido
            solicitacaoId={selecionada.id}
            nomeOutraParte={selecionada.nome}
            categoria={selecionada.categoria}
            onVoltar={() => setSelecionada(null)}
          />
        ) : (
          <View style={styles.vazioContainer}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.muted} />
            <Text style={styles.vazioTexto}>Selecione uma conversa pra ver as mensagens.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, flexDirection: "row", backgroundColor: colors.canvas },
    lista: { width: 380, borderRightWidth: 1, borderRightColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    titulo: { fontSize: 24, fontWeight: "700", color: colors.ink },
    subtitulo: { color: colors.muted, fontSize: 13, marginTop: 4 },
    detalhe: { flex: 1 },
    vazioContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
    vazioTexto: { color: colors.muted },
  });
}
