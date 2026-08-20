import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { apiFetch } from "@/lib/api";
import { colors, radius, spacing } from "@/theme";

interface Categoria {
  id: string;
  nome: string;
}

export function HomeScreen({ onNovaSolicitacao }: { onNovaSolicitacao: () => void }) {
  const { usuario } = useAuth();
  const { isWide } = useResponsive();
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    apiFetch<Categoria[]>("/categorias").then(setCategorias).catch(() => setCategorias([]));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <View style={styles.header}>
          <View>
            <Text style={styles.saudacao}>Olá, {usuario?.nome?.split(" ")[0] ?? ""}!</Text>
            <Text style={styles.subtitulo}>O que você precisa hoje?</Text>
          </View>
        </View>

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
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  saudacao: { fontSize: 20, fontWeight: "700", color: colors.ink },
  subtitulo: { color: colors.muted, marginTop: spacing.xs },
  cta: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  ctaTexto: { color: colors.white, fontWeight: "700", fontSize: 15 },
  secaoTitulo: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
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
});
