import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

interface Etapa {
  chave: string;
  label: string;
}

interface Props {
  etapas: Etapa[];
  chaveAtiva: string;
}

// Stepper horizontal de 4 passos (as mesmas 4 abas de Meus Pedidos) --
// "cancelado" é tratado como estado terminal à parte (vermelho), não como
// um passo 4 sequencial de verdade.
export function OrderProgressStepper({ etapas, chaveAtiva }: Props) {
  const { colors } = useTheme();
  const styles = criarStyles(colors);
  const indiceAtivo = etapas.findIndex((e) => e.chave === chaveAtiva);
  const cancelado = chaveAtiva === "cancelado";

  return (
    <View style={styles.container}>
      {etapas.map((etapa, i) => {
        const concluida = !cancelado && i < indiceAtivo;
        const ativa = etapa.chave === chaveAtiva;
        const corPonto = cancelado && etapa.chave === "cancelado" ? colors.erro : ativa || concluida ? colors.primary : colors.border;

        return (
          <View key={etapa.chave} style={styles.etapa}>
            <View style={styles.linhaPonto}>
              <View style={[styles.ponto, { backgroundColor: corPonto }]}>
                {(concluida || (ativa && !cancelado)) && (
                  <Ionicons name={concluida ? "checkmark" : "ellipse"} size={concluida ? 10 : 6} color={colors.white} />
                )}
              </View>
              {i < etapas.length - 1 && (
                <View style={[styles.linha, { backgroundColor: concluida ? colors.primary : colors.border }]} />
              )}
            </View>
            <Text style={[styles.label, ativa && styles.labelAtivo]} numberOfLines={1}>
              {etapa.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flexDirection: "row" },
    etapa: { flex: 1, alignItems: "center" },
    linhaPonto: { flexDirection: "row", alignItems: "center", width: "100%" },
    ponto: {
      width: 16,
      height: 16,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: "auto",
      marginRight: "auto",
    },
    linha: { flex: 1, height: 2 },
    label: { fontSize: 10, color: colors.muted, marginTop: 4, textAlign: "center" },
    labelAtivo: { color: colors.ink, fontWeight: "700" },
  });
}
