import { View, StyleSheet, type ViewProps } from "react-native";
import { useResponsive } from "@/hooks/useResponsive";

// Em telas largas (web/tablet), limita a largura do conteúdo e centraliza,
// em vez de esticar borda a borda como faz sentido no celular.
export function ResponsiveContent({ style, children, ...props }: ViewProps) {
  const { isWide } = useResponsive();
  return (
    <View style={[styles.base, isWide && styles.wide, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, width: "100%" },
  wide: { maxWidth: 760, alignSelf: "center" },
});
