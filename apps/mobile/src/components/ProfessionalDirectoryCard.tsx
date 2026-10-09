import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AvaliacaoBadge } from "@/components/AvaliacaoBadge";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

export interface ProfissionalResumo {
  id: string;
  usuario: { id: string; nome: string; fotoUrl: string | null };
  online: boolean;
  avaliacaoMedia: number | string;
  categorias: { nome: string; precoBase: number | string | null }[];
  precoMinimo: number | string | null;
}

interface Props {
  profissional: ProfissionalResumo;
  onPress: () => void;
  // Largura fixa (carrossel) vs esticar (lista) -- o mesmo card serve os
  // dois lugares do app que mostram profissionais.
  largura?: number;
}

export function ProfessionalDirectoryCard({ profissional, onPress, largura }: Props) {
  const { colors } = useTheme();
  const styles = criarStyles(colors);
  const categoriaPrincipal = profissional.categorias[0]?.nome;

  return (
    <TouchableOpacity style={[styles.card, largura ? { width: largura } : undefined]} onPress={onPress}>
      <View style={styles.cabecalho}>
        {profissional.usuario.fotoUrl ? (
          <Image source={{ uri: profissional.usuario.fotoUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackTexto}>{profissional.usuario.nome[0]?.toUpperCase() ?? "?"}</Text>
          </View>
        )}
        {profissional.online && (
          <View style={styles.badgeVerificado}>
            <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
            <Text style={styles.badgeVerificadoTexto}>Disponível hoje</Text>
          </View>
        )}
      </View>

      <Text style={styles.nome} numberOfLines={1}>
        {profissional.usuario.nome}
      </Text>
      {categoriaPrincipal && <Text style={styles.categoria}>{categoriaPrincipal}</Text>}
      <AvaliacaoBadge nota={profissional.avaliacaoMedia} tamanhoEstrela={13} tamanhoTexto={12} />

      {profissional.precoMinimo !== null && (
        <Text style={styles.preco}>
          A partir de <Text style={styles.precoValor}>R$ {Number(profissional.precoMinimo).toFixed(0)}</Text>
        </Text>
      )}

      <View style={styles.botao}>
        <Text style={styles.botaoTexto}>Ver perfil</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
    cabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
    avatar: { width: 44, height: 44, borderRadius: radius.full },
    avatarFallback: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarFallbackTexto: { color: colors.primary, fontWeight: "700", fontSize: 17 },
    badgeVerificado: { flexDirection: "row", alignItems: "center", gap: 3 },
    badgeVerificadoTexto: { fontSize: 10, color: colors.primary, fontWeight: "600" },
    nome: { fontSize: 15, fontWeight: "700", color: colors.ink },
    categoria: { fontSize: 12, color: colors.muted, marginBottom: 2 },
    preco: { fontSize: 12, color: colors.muted, marginTop: spacing.xs },
    precoValor: { color: colors.ink, fontWeight: "700" },
    botao: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm },
    botaoTexto: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  });
}
