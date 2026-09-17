import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { colors, radius, spacing } from "@/theme";

// Só faz sentido mostrar pra quem realmente tem os dois papéis — pra uma
// conta só-cliente isso seria um controle sem função (o modo já é sempre
// "cliente" nesse caso, ver AuthContext).
export function ModoSwitcher() {
  const { usuario, modo, definirModo } = useAuth();

  if (!usuario?.isCliente || !usuario?.isAutonomo) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.opcao, modo === "cliente" && styles.opcaoAtiva]}
        onPress={() => definirModo("cliente")}
      >
        <Text style={[styles.texto, modo === "cliente" && styles.textoAtivo]}>Estou como Cliente</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.opcao, modo === "autonomo" && styles.opcaoAtiva]}
        onPress={() => definirModo("autonomo")}
      >
        <Text style={[styles.texto, modo === "autonomo" && styles.textoAtivo]}>Estou como Autônomo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: radius.full,
    padding: 4,
    gap: 4,
    marginTop: spacing.md,
  },
  opcao: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.full, alignItems: "center" },
  opcaoAtiva: { backgroundColor: colors.primary },
  texto: { color: colors.muted, fontWeight: "700", fontSize: 12.5 },
  textoAtivo: { color: colors.white },
});
