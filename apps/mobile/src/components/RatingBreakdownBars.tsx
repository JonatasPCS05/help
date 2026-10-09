import { StyleSheet, Text, View } from "react-native";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

interface ResumoAvaliacoes {
  total: number;
  porEstrela: Record<string, { quantidade: number; percentual: number }>;
}

// Gráfico de barras horizontal (5 estrelas até 1), construído à mão com
// View -- sem lib de gráfico, mesmo espírito do RelogioAnimado.
export function RatingBreakdownBars({ resumo }: { resumo: ResumoAvaliacoes }) {
  const { colors } = useTheme();
  const styles = criarStyles(colors);

  return (
    <View style={styles.container}>
      {[5, 4, 3, 2, 1].map((estrela) => {
        const linha = resumo.porEstrela[estrela] ?? { quantidade: 0, percentual: 0 };
        return (
          <View key={estrela} style={styles.linha}>
            <Text style={styles.label}>{estrela} estrelas</Text>
            <View style={styles.trilho}>
              <View style={[styles.preenchido, { width: `${linha.percentual}%` }]} />
            </View>
            <Text style={styles.percentual}>{linha.percentual}%</Text>
          </View>
        );
      })}
    </View>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    container: { gap: spacing.xs },
    linha: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    label: { width: 64, fontSize: 12, color: colors.muted },
    trilho: { flex: 1, height: 8, borderRadius: radius.full, backgroundColor: colors.border, overflow: "hidden" },
    preenchido: { height: "100%", borderRadius: radius.full, backgroundColor: colors.primary },
    percentual: { width: 36, fontSize: 12, color: colors.muted, textAlign: "right" },
  });
}
