import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

interface Props {
  icone: keyof typeof Ionicons.glyphMap;
  numero: number | string;
  label: string;
  onPress?: () => void;
}

export function StatCard({ icone, numero, label, onPress }: Props) {
  const { colors } = useTheme();
  const styles = criarStyles(colors);
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container style={styles.card} onPress={onPress}>
      <View style={styles.iconeContainer}>
        <Ionicons name={icone} size={18} color={colors.primary} />
      </View>
      <Text style={styles.numero}>{numero}</Text>
      <Text style={styles.label}>{label}</Text>
    </Container>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    card: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: 2, minWidth: 130 },
    iconeContainer: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xs,
    },
    numero: { fontSize: 22, fontWeight: "700", color: colors.ink },
    label: { fontSize: 12, color: colors.muted },
  });
}
