import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COR_ESTRELA, corAvaliacao } from "@/lib/rating";

interface Props {
  nota: number | string;
  tamanhoEstrela?: number;
  tamanhoTexto?: number;
}

export function AvaliacaoBadge({ nota, tamanhoEstrela = 14, tamanhoTexto = 13 }: Props) {
  const valor = Number(nota);
  return (
    <View style={styles.container}>
      <Ionicons name="star" size={tamanhoEstrela} color={COR_ESTRELA} />
      <Text style={[styles.texto, { color: corAvaliacao(valor), fontSize: tamanhoTexto }]}>{valor.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 4 },
  texto: { fontWeight: "700" },
});
