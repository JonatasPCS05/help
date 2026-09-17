import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useResponsive } from "@/hooks/useResponsive";
import { apiFetch } from "@/lib/api";
import { colors, radius, spacing } from "@/theme";

interface Props {
  onEntrar: () => void;
}

const ETAPAS: { icone: keyof typeof Ionicons.glyphMap; titulo: string; texto: string }[] = [
  {
    icone: "create-outline",
    titulo: "Peça o serviço",
    texto: "Descreva o que você precisa, escolha o endereço e a data que funciona pra você.",
  },
  {
    icone: "document-text-outline",
    titulo: "Receba o orçamento",
    texto: "O profissional agenda uma visita quando necessário e te envia um valor antes de começar.",
  },
  {
    icone: "shield-checkmark-outline",
    titulo: "Pague com segurança",
    texto: "O valor fica retido na plataforma e só é liberado ao profissional quando você confirma a conclusão.",
  },
];

interface Categoria {
  id: string;
  nome: string;
}

// Categorias são administráveis (painel admin pode criar/renomear/
// desativar a qualquer momento) — por isso a landing busca a lista real
// em vez de manter uma cópia fixa que ficaria desatualizada. Ícone é só
// estético: categorias conhecidas ganham um ícone específico, qualquer
// categoria nova (inclusive as que o admin ainda vai criar) cai no
// ícone padrão sem quebrar nada.
const ICONE_POR_CATEGORIA: Record<string, keyof typeof Ionicons.glyphMap> = {
  Jardineiro: "leaf-outline",
  Piscineiro: "water-outline",
  Pedreiro: "hammer-outline",
  Eletricista: "flash-outline",
  Encanador: "build-outline",
  Pintor: "color-palette-outline",
  Diarista: "home-outline",
  "Montador de Móveis": "cube-outline",
  "Técnico de Ar-condicionado": "snow-outline",
  Chaveiro: "key-outline",
  "Pequenos Reparos": "construct-outline",
};
const ICONE_CATEGORIA_PADRAO: keyof typeof Ionicons.glyphMap = "construct-outline";

const BENEFICIOS: { icone: keyof typeof Ionicons.glyphMap; titulo: string; texto: string }[] = [
  {
    icone: "shield-checkmark-outline",
    titulo: "Pagamento protegido",
    texto: "Seu dinheiro só é repassado ao profissional depois que você confirma que o serviço foi concluído.",
  },
  {
    icone: "id-card-outline",
    titulo: "Profissionais verificados",
    texto: "Todo autônomo passa por aprovação de CNPJ antes de poder atender pedidos.",
  },
  {
    icone: "star-outline",
    titulo: "Avaliações reais",
    texto: "Veja a nota de quem já contratou antes de fechar negócio, sem surpresas.",
  },
  {
    icone: "chatbubble-ellipses-outline",
    titulo: "Chat direto",
    texto: "Combine detalhes do serviço com o profissional sem sair do app.",
  },
];

export function LandingScreen({ onEntrar }: Props) {
  const { isWide } = useResponsive();
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  useEffect(() => {
    apiFetch<Categoria[]>("/categorias")
      .then((lista) => setCategorias(lista.filter((c) => c.nome !== "Outro Serviço")))
      .catch(() => setCategorias([]));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.heroConteudo}>
            <View style={styles.heroLogo}>
              <Text style={styles.heroLogoTexto}>H</Text>
            </View>
            <Text style={styles.heroTitulo}>HelpMate</Text>
            <Text style={styles.heroTagline}>
              Encontre profissionais de confiança pra resolver serviços domésticos perto de você.{"\n"}
              Do pedido ao pagamento, tudo em um só lugar.
            </Text>
            <TouchableOpacity style={styles.botaoHero} onPress={onEntrar}>
              <Text style={styles.botaoHeroTexto}>Entrar ou criar conta</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.corpo, isWide && styles.corpoWide]}>
          <Text style={styles.secaoTitulo}>Como funciona</Text>
          <View style={[styles.grade, isWide && styles.gradeWide]}>
            {ETAPAS.map((etapa, i) => (
              <View key={etapa.titulo} style={[styles.cardEtapa, isWide && styles.cardWide]}>
                <View style={styles.numero}>
                  <Text style={styles.numeroTexto}>{i + 1}</Text>
                </View>
                <Ionicons name={etapa.icone} size={26} color={colors.primary} style={styles.cardIcone} />
                <Text style={styles.cardTitulo}>{etapa.titulo}</Text>
                <Text style={styles.cardTexto}>{etapa.texto}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.secaoTitulo}>O que você encontra por aqui</Text>
          <View style={styles.categorias}>
            {categorias.map((cat) => (
              <View key={cat.id} style={styles.categoriaChip}>
                <Ionicons name={ICONE_POR_CATEGORIA[cat.nome] ?? ICONE_CATEGORIA_PADRAO} size={19} color={colors.secondary} />
                <Text style={styles.categoriaTexto}>{cat.nome}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.secaoTitulo}>Por que usar o HelpMate</Text>
          <View style={[styles.grade, isWide && styles.gradeWide]}>
            {BENEFICIOS.map((b) => (
              <View key={b.titulo} style={[styles.cardBeneficio, isWide && styles.cardWide]}>
                <Ionicons name={b.icone} size={22} color={colors.primary} style={styles.cardIcone} />
                <Text style={styles.cardTitulo}>{b.titulo}</Text>
                <Text style={styles.cardTexto}>{b.texto}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaFinal}>
            <Text style={styles.ctaFinalTitulo}>Pronto pra resolver aquele serviço parado?</Text>
            <TouchableOpacity style={styles.botaoHero} onPress={onEntrar}>
              <Text style={styles.botaoHeroTexto}>Entrar ou criar conta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1 },
  hero: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl * 1.5,
    paddingHorizontal: spacing.lg,
  },
  heroConteudo: { alignItems: "center", maxWidth: 560, alignSelf: "center", width: "100%" },
  heroLogo: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroLogoTexto: { color: colors.white, fontSize: 28, fontWeight: "700" },
  heroTitulo: { color: colors.white, fontSize: 32, fontWeight: "700", marginBottom: spacing.sm },
  heroTagline: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  botaoHero: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  botaoHeroTexto: { color: colors.primary, fontWeight: "700", fontSize: 15 },

  corpo: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl * 1.5, gap: spacing.xl },
  corpoWide: { maxWidth: 980, alignSelf: "center", width: "100%" },
  secaoTitulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: spacing.md, textAlign: "center" },

  grade: { gap: spacing.md },
  gradeWide: { flexDirection: "row" },
  cardWide: { flex: 1 },

  cardEtapa: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    position: "relative",
  },
  numero: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  numeroTexto: { color: colors.primary, fontWeight: "700", fontSize: 12 },
  cardIcone: { marginBottom: spacing.sm },
  cardTitulo: { fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
  cardTexto: { fontSize: 13, color: colors.muted, lineHeight: 19 },

  categorias: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  categoriaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.secondaryLight,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  categoriaTexto: { color: colors.secondary, fontWeight: "700", fontSize: 13 },

  cardBeneficio: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg },

  ctaFinal: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  ctaFinalTitulo: { fontSize: 17, fontWeight: "700", color: colors.primaryDark, textAlign: "center" },
});
