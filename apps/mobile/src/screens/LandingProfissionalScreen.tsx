import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useResponsive } from "@/hooks/useResponsive";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

interface Props {
  onCriarPerfil: () => void;
  onVoltar: () => void;
}

const VANTAGENS: { icone: keyof typeof Ionicons.glyphMap; titulo: string; texto: string }[] = [
  {
    icone: "people-outline",
    titulo: "Receba novos clientes",
    texto: "Seja encontrado por pessoas da sua região que precisam dos seus serviços.",
  },
  {
    icone: "calendar-outline",
    titulo: "Organize seus atendimentos",
    texto: "Gerencie suas solicitações, converse com os clientes e acompanhe tudo em um só lugar.",
  },
  {
    icone: "star-outline",
    titulo: "Construa sua reputação",
    texto: "Receba avaliações reais e construa um perfil confiável pra atrair mais clientes.",
  },
  {
    icone: "shield-checkmark-outline",
    titulo: "Recebimento com segurança",
    texto: "Conte com pagamento protegido pela plataforma e mais tranquilidade no seu trabalho.",
  },
];

const ETAPAS = [
  { titulo: "Crie seu perfil", texto: "Informe os serviços que realiza e onde atende." },
  { titulo: "Receba solicitações", texto: "Clientes da sua região encontram você." },
  { titulo: "Combine o serviço", texto: "Converse com o cliente e organize o atendimento." },
  { titulo: "Realize e receba", texto: "Conclua o serviço e receba pela plataforma." },
];

export function LandingProfissionalScreen({ onCriarPerfil, onVoltar }: Props) {
  const { isWide } = useResponsive();
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={onVoltar} style={styles.voltar}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.voltarTexto}>Voltar</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <Text style={styles.heroTitulo}>Encontre clientes para os serviços que você oferece.</Text>
          <Text style={styles.heroTagline}>
            Crie seu perfil profissional, receba solicitações de serviços da sua região e gerencie todo o seu
            trabalho pelo HelpMate.
          </Text>
          <TouchableOpacity style={styles.botaoHero} onPress={onCriarPerfil}>
            <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
            <Text style={styles.botaoHeroTexto}>Criar perfil profissional</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.corpo, isWide && styles.corpoWide]}>
          <Text style={styles.secaoTitulo}>Vantagens de trabalhar pelo HelpMate</Text>
          <View style={[styles.grade, isWide && styles.gradeWide]}>
            {VANTAGENS.map((v) => (
              <View key={v.titulo} style={[styles.card, isWide && styles.cardWide]}>
                <Ionicons name={v.icone} size={22} color={colors.primary} style={styles.cardIcone} />
                <Text style={styles.cardTitulo}>{v.titulo}</Text>
                <Text style={styles.cardTexto}>{v.texto}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.secaoTitulo}>Como funciona</Text>
          <View style={[styles.grade, isWide && styles.gradeWide]}>
            {ETAPAS.map((e, i) => (
              <View key={e.titulo} style={[styles.card, isWide && styles.cardWide]}>
                <View style={styles.numero}>
                  <Text style={styles.numeroTexto}>{i + 1}</Text>
                </View>
                <Text style={styles.cardTitulo}>{e.titulo}</Text>
                <Text style={styles.cardTexto}>{e.texto}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaFinal}>
            <Text style={styles.ctaFinalTitulo}>Pronto pra conseguir novos clientes?</Text>
            <TouchableOpacity style={styles.botaoHeroEscuro} onPress={onCriarPerfil}>
              <Text style={styles.botaoHeroEscuroTexto}>Criar perfil profissional</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.canvas },
    scroll: { flexGrow: 1 },
    voltar: { flexDirection: "row", alignItems: "center", gap: 4, padding: spacing.md },
    voltarTexto: { color: colors.white, fontWeight: "600" },
    hero: {
      backgroundColor: colors.primaryDark,
      marginTop: -spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
    },
    heroTitulo: { color: colors.white, fontSize: 26, fontWeight: "700", textAlign: "center", maxWidth: 560, alignSelf: "center" },
    heroTagline: {
      color: "rgba(255,255,255,0.9)",
      fontSize: 14,
      textAlign: "center",
      lineHeight: 21,
      marginTop: spacing.sm,
      marginBottom: spacing.lg,
      maxWidth: 480,
      alignSelf: "center",
    },
    botaoHero: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      backgroundColor: colors.white,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      alignSelf: "center",
    },
    botaoHeroTexto: { color: colors.primary, fontWeight: "700" },
    corpo: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },
    corpoWide: { maxWidth: 980, alignSelf: "center", width: "100%" },
    secaoTitulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: spacing.md, textAlign: "center" },
    grade: { gap: spacing.md },
    gradeWide: { flexDirection: "row", flexWrap: "wrap" },
    card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, position: "relative" },
    cardWide: { flexBasis: "47%", flexGrow: 1 },
    cardIcone: { marginBottom: spacing.sm },
    numero: {
      width: 24,
      height: 24,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.sm,
    },
    numeroTexto: { color: colors.primary, fontWeight: "700", fontSize: 12 },
    cardTitulo: { fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
    cardTexto: { fontSize: 13, color: colors.muted, lineHeight: 19 },
    ctaFinal: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.xl,
      padding: spacing.xl,
      alignItems: "center",
      gap: spacing.md,
    },
    ctaFinalTitulo: { fontSize: 17, fontWeight: "700", color: colors.primaryDark, textAlign: "center" },
    botaoHeroEscuro: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
    botaoHeroEscuroTexto: { color: colors.white, fontWeight: "700" },
  });
}
