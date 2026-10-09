import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { spacing } from "@/theme";

// Carrossel horizontal simples (scroll manual, sem avanço automático --
// conteúdo que se move sozinho atrapalha leitura e acessibilidade) --
// FlatList horizontal bastaria, mas ScrollView é mais simples pra poucos
// itens (até ~6 cards) como "profissionais em destaque".
export function Carousel({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, paddingRight: spacing.lg },
});
