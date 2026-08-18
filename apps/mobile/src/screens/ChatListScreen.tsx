import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@/theme";

export function ChatListScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.titulo}>Chat</Text>
      <Text style={styles.vazio}>
        As conversas de cada solicitação aparecem aqui assim que um orçamento for aceito.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.md },
  vazio: { color: colors.muted, marginTop: spacing.lg },
});
