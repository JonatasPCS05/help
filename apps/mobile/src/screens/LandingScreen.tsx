import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useResponsive } from "@/hooks/useResponsive";
import { apiFetch } from "@/lib/api";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";
import { ProfessionalDirectoryCard, type ProfissionalResumo } from "@/components/ProfessionalDirectoryCard";
import { ICONE_POR_CATEGORIA, ICONE_CATEGORIA_PADRAO } from "@/lib/categoriaIcones";

interface Props {
  onEntrar: () => void;
  onCriarConta: () => void;
  onParaProfissionais: () => void;
  onBuscar: (localizacao: string) => void;
  onVerPerfilProfissional: (id: string) => void;
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

export function LandingScreen({ onEntrar, onCriarConta, onParaProfissionais, onBuscar, onVerPerfilProfissional }: Props) {
  const { isWide } = useResponsive();
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [localizacao, setLocalizacao] = useState("");
  const [destaques, setDestaques] = useState<ProfissionalResumo[] | null>(null);

  useEffect(() => {
    apiFetch<Categoria[]>("/categorias")
      .then((lista) => setCategorias(lista.filter((c) => c.nome !== "Outro Serviço")))
      .catch(() => setCategorias([]));
    apiFetch<ProfissionalResumo[]>("/publico/autonomos?ordenar=avaliacao")
      .then((lista) => setDestaques(lista.slice(0, 4)))
      .catch(() => setDestaques([]));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cabecalho}>
          <View style={styles.marca}>
            <Ionicons name="home" size={22} color={colors.primary} />
            <Text style={styles.marcaTexto}>HelpMate</Text>
          </View>
          {isWide && (
            <TouchableOpacity onPress={onParaProfissionais}>
              <Text style={styles.linkParaProfissionais}>Para profissionais</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.botaoEntrarCabecalho} onPress={onEntrar}>
            <Ionicons name="person-outline" size={14} color={colors.primary} />
            <Text style={styles.botaoEntrarCabecalhoTexto}>Entrar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroConteudo}>
            <Text style={styles.heroTitulo}>Encontre profissionais para resolver o que você precisa.</Text>
            <Text style={styles.heroTagline}>
              Pesquise serviços, compare profissionais da sua região e contrate com segurança pelo HelpMate.
            </Text>
            <View style={[styles.heroBotoes, isWide && styles.heroBotoesWide]}>
              <TouchableOpacity style={styles.botaoPrimario} onPress={onCriarConta}>
                <Ionicons name="home-outline" size={16} color={colors.white} />
                <Text style={styles.botaoPrimarioTexto}>Quero contratar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoSecundario} onPress={onParaProfissionais}>
                <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
                <Text style={styles.botaoSecundarioTexto}>Quero trabalhar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buscaCard}>
              <View style={styles.buscaLinha}>
                <Ionicons name="location-outline" size={16} color={colors.muted} />
                <TextInput
                  style={styles.buscaInput}
                  value={localizacao}
                  onChangeText={setLocalizacao}
                  placeholder="Cidade, bairro..."
                  placeholderTextColor={colors.muted}
                  onSubmitEditing={() => onBuscar(localizacao)}
                />
              </View>
              <TouchableOpacity style={styles.buscaBotao} onPress={() => onBuscar(localizacao)}>
                <Ionicons name="search" size={16} color={colors.white} />
                <Text style={styles.buscaBotaoTexto}>Ver profissionais</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.corpo, isWide && styles.corpoWide]}>
          <Text style={styles.secaoTitulo}>Serviços mais buscados</Text>
          <View style={styles.categorias}>
            {categorias.map((cat) => (
              <TouchableOpacity key={cat.id} style={styles.categoriaChip} onPress={() => onBuscar("")}>
                <Ionicons name={ICONE_POR_CATEGORIA[cat.nome] ?? ICONE_CATEGORIA_PADRAO} size={17} color={colors.primary} />
                <Text style={styles.categoriaTexto}>{cat.nome}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.secaoTitulo}>Profissionais em destaque</Text>
          {destaques === null ? (
            <ActivityIndicator color={colors.primary} />
          ) : destaques.length === 0 ? (
            <Text style={styles.semDestaque}>Ainda não temos profissionais cadastrados pra mostrar aqui.</Text>
          ) : (
            <View style={[styles.gradeDestaques, isWide && styles.gradeDestaquesWide]}>
              {destaques.map((p) => (
                <ProfessionalDirectoryCard
                  key={p.id}
                  profissional={p}
                  onPress={() => onVerPerfilProfissional(p.id)}
                  largura={isWide ? 220 : undefined}
                />
              ))}
            </View>
          )}

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

          <View style={styles.ctaFinal}>
            <Text style={styles.ctaFinalTitulo}>Pronto pra resolver aquele serviço parado?</Text>
            <TouchableOpacity style={styles.botaoPrimario} onPress={onCriarConta}>
              <Text style={styles.botaoPrimarioTexto}>Entrar ou criar conta</Text>
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

  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  marca: { flexDirection: "row", alignItems: "center", gap: 6 },
  marcaTexto: { fontSize: 17, fontWeight: "700", color: colors.ink },
  linkParaProfissionais: { color: colors.ink, fontWeight: "600", fontSize: 13 },
  botaoEntrarCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  botaoEntrarCabecalhoTexto: { color: colors.primary, fontWeight: "700", fontSize: 12.5 },

  hero: {
    backgroundColor: colors.primaryLight,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  heroConteudo: { maxWidth: 620, alignSelf: "center", width: "100%" },
  heroTitulo: { fontSize: 28, fontWeight: "700", color: colors.ink, lineHeight: 34 },
  heroTagline: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm, marginBottom: spacing.lg },

  heroBotoes: { gap: spacing.sm, marginBottom: spacing.lg },
  heroBotoesWide: { flexDirection: "row" },
  botaoPrimario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  botaoPrimarioTexto: { color: colors.white, fontWeight: "700", fontSize: 15 },
  botaoSecundario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  botaoSecundarioTexto: { color: colors.primary, fontWeight: "700", fontSize: 15 },

  buscaCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.sm, gap: spacing.sm },
  buscaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  buscaInput: { flex: 1, paddingVertical: spacing.sm, color: colors.ink },
  buscaBotao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  buscaBotaoTexto: { color: colors.white, fontWeight: "700", fontSize: 13 },

  corpo: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl * 1.5, gap: spacing.xl },
  corpoWide: { maxWidth: 980, alignSelf: "center", width: "100%" },
  secaoTitulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: spacing.md, textAlign: "center" },

  grade: { gap: spacing.md },
  gradeWide: { flexDirection: "row" },
  cardWide: { flex: 1 },

  cardEtapa: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, position: "relative" },
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
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  categoriaTexto: { color: colors.primaryDark, fontWeight: "700", fontSize: 13 },

  gradeDestaques: { gap: spacing.md },
  gradeDestaquesWide: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  semDestaque: { color: colors.muted, textAlign: "center" },

  ctaFinal: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  ctaFinalTitulo: { fontSize: 17, fontWeight: "700", color: colors.primaryDark, textAlign: "center" },
  });
}
