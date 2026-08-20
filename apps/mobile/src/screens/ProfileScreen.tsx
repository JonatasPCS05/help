import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { colors, radius, spacing } from "@/theme";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { confirmarAcao } from "@/lib/confirm";

export function ProfileScreen() {
  const { usuario, sair } = useAuth();

  function confirmarSaida() {
    confirmarAcao("Sair da conta", "Tem certeza que deseja sair da sua conta?", sair);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{usuario?.nome?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <Text style={styles.nome}>{usuario?.nome}</Text>
          <Text style={styles.nota}>★ {Number(usuario?.avaliacaoMediaCliente ?? 0).toFixed(1)}</Text>
        </View>

        <View style={styles.menu}>
          <Text style={styles.menuItem}>Editar Perfil</Text>
          <Text style={styles.menuItem}>Histórico</Text>
          <Text style={styles.menuItem}>Pagamentos</Text>
        </View>

        {!usuario?.isAutonomo && (
          <View style={styles.ctaCard}>
            <TouchableOpacity style={styles.cta}>
              <Text style={styles.ctaTexto}>Quero ser Autônomo</Text>
            </TouchableOpacity>
            <Text style={styles.ctaSubtitulo}>
              Cadastre-se como prestador de serviços e aumente sua renda oferecendo seu trabalho para milhares de clientes.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.sair} onPress={confirmarSaida}>
          <Text style={styles.sairTexto}>Sair</Text>
        </TouchableOpacity>
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  header: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarTexto: { fontSize: 28, fontWeight: "700", color: colors.primary },
  nome: { fontSize: 18, fontWeight: "700", color: colors.ink },
  nota: { color: colors.secondary, marginTop: spacing.xs },
  menu: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: "hidden" },
  menuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    color: colors.ink,
    fontWeight: "600",
  },
  ctaCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg },
  cta: { backgroundColor: colors.secondary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center" },
  ctaTexto: { color: colors.white, fontWeight: "700" },
  ctaSubtitulo: { color: colors.muted, marginTop: spacing.sm, fontSize: 12 },
  sair: { marginTop: spacing.lg, alignItems: "center", paddingVertical: spacing.md },
  sairTexto: { color: colors.muted, fontWeight: "600" },
});
