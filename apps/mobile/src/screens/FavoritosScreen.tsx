import { useCallback, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { AvaliacaoBadge } from "@/components/AvaliacaoBadge";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

interface Favorito {
  id: string;
  autonomo: {
    id: string;
    usuario: { id: string; nome: string; fotoUrl: string | null; avaliacaoMediaAutonomo: number | string };
    categorias: { categoria: { nome: string } }[];
  };
}

interface Props {
  onVoltar: () => void;
  onVerPerfil: (autonomoId: string) => void;
}

export function FavoritosScreen({ onVoltar, onVerPerfil }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      apiFetch<Favorito[]>("/favoritos")
        .then(setFavoritos)
        .catch(() => setFavoritos([]))
        .finally(() => setCarregando(false));
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <View style={styles.cabecalho}>
          <TouchableOpacity onPress={onVoltar}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.titulo}>Favoritos</Text>
        </View>

        <FlatList
          data={favoritos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onVerPerfil(item.autonomo.id)}>
              {item.autonomo.usuario.fotoUrl ? (
                <Image source={{ uri: item.autonomo.usuario.fotoUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackTexto}>{item.autonomo.usuario.nome[0]?.toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{item.autonomo.usuario.nome}</Text>
                <Text style={styles.categoria}>{item.autonomo.categorias[0]?.categoria.nome}</Text>
                <AvaliacaoBadge nota={item.autonomo.usuario.avaliacaoMediaAutonomo} tamanhoEstrela={13} tamanhoTexto={12} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !carregando ? (
              <Text style={styles.vazio}>
                Você ainda não salvou nenhum profissional. Toque no coração no perfil de um profissional pra salvá-lo aqui.
              </Text>
            ) : null
          }
        />
      </ResponsiveContent>
    </SafeAreaView>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
    cabecalho: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
    titulo: { fontSize: 20, fontWeight: "700", color: colors.ink },
    card: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md },
    avatar: { width: 48, height: 48, borderRadius: radius.full },
    avatarFallback: {
      width: 48,
      height: 48,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarFallbackTexto: { color: colors.primary, fontWeight: "700", fontSize: 17 },
    nome: { fontWeight: "700", color: colors.ink, fontSize: 15 },
    categoria: { color: colors.muted, fontSize: 12, marginBottom: 2 },
    vazio: { color: colors.muted, textAlign: "center", marginTop: spacing.xl },
  });
}
