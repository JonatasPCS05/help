import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";
import { FilterSidebar, type FiltrosBusca } from "@/components/FilterSidebar";
import { ProfessionalDirectoryCard, type ProfissionalResumo } from "@/components/ProfessionalDirectoryCard";

interface Categoria {
  id: string;
  nome: string;
}

interface Props {
  localizacaoInicial?: string;
  categoriaInicial?: string | null;
  onVerPerfil: (id: string) => void;
  onVoltar: () => void;
}

const FILTROS_INICIAIS: FiltrosBusca = {
  categoria: null,
  avaliacaoMinima: null,
  precoMax: null,
  disponivelHoje: false,
  ordenar: "avaliacao",
};

export function BrowseProfessionalsScreen({ localizacaoInicial, categoriaInicial, onVerPerfil, onVoltar }: Props) {
  const { colors } = useTheme();
  const { isWide } = useResponsive();
  const styles = useMemo(() => criarStyles(colors), [colors]);

  const [localizacao, setLocalizacao] = useState(localizacaoInicial ?? "");
  const [filtros, setFiltros] = useState<FiltrosBusca>({ ...FILTROS_INICIAIS, categoria: categoriaInicial ?? null });
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);

  useEffect(() => {
    apiFetch<Categoria[]>("/categorias")
      .then((lista) => setCategorias(lista.filter((c) => c.nome !== "Outro Serviço")))
      .catch(() => setCategorias([]));
  }, []);

  const buscar = useCallback(() => {
    setCarregando(true);
    const params = new URLSearchParams();
    if (localizacao.trim()) params.set("localizacao", localizacao.trim());
    if (filtros.categoria) params.set("categoria", filtros.categoria);
    if (filtros.avaliacaoMinima) params.set("avaliacaoMinima", String(filtros.avaliacaoMinima));
    if (filtros.precoMax) params.set("precoMax", String(filtros.precoMax));
    if (filtros.disponivelHoje) params.set("disponivelHoje", "true");
    params.set("ordenar", filtros.ordenar);

    apiFetch<ProfissionalResumo[]>(`/publico/autonomos?${params.toString()}`)
      .then(setProfissionais)
      .catch(() => setProfissionais([]))
      .finally(() => setCarregando(false));
  }, [localizacao, filtros]);

  useEffect(() => {
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros]);

  const painelFiltros = <FilterSidebar categorias={categorias} filtros={filtros} onMudar={setFiltros} />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.cabecalho}>
        <TouchableOpacity onPress={onVoltar} style={styles.voltar}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.buscaLinha}>
          <TextInput
            style={styles.buscaInput}
            value={localizacao}
            onChangeText={setLocalizacao}
            placeholder="Cidade, bairro..."
            placeholderTextColor={colors.muted}
            onSubmitEditing={buscar}
          />
          <TouchableOpacity style={styles.buscaBotao} onPress={buscar}>
            <Ionicons name="search" size={16} color={colors.white} />
            <Text style={styles.buscaBotaoTexto}>Buscar</Text>
          </TouchableOpacity>
        </View>
        {!isWide && (
          <TouchableOpacity style={styles.filtrosBotaoMobile} onPress={() => setMostrarFiltrosMobile(true)}>
            <Ionicons name="options-outline" size={18} color={colors.primary} />
            <Text style={styles.filtrosBotaoMobileTexto}>Filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.corpo, isWide && styles.corpoWide]}>
        {isWide && <View style={styles.sidebar}>{painelFiltros}</View>}

        <View style={styles.listaContainer}>
          <Text style={styles.resultadoTitulo}>
            {carregando ? "Buscando..." : `${profissionais.length} profissional(is) encontrado(s)`}
          </Text>
          {carregando ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <FlatList
              data={profissionais}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xl }}
              ListEmptyComponent={<Text style={styles.vazio}>Nenhum profissional encontrado com esses filtros.</Text>}
              renderItem={({ item }) => (
                <ProfessionalDirectoryCard profissional={item} onPress={() => onVerPerfil(item.id)} />
              )}
            />
          )}
        </View>
      </View>

      <Modal visible={mostrarFiltrosMobile} animationType="slide" onRequestClose={() => setMostrarFiltrosMobile(false)}>
        <SafeAreaView style={styles.container}>
          <View style={styles.modalCabecalho}>
            <Text style={styles.resultadoTitulo}>Filtros</Text>
            <TouchableOpacity onPress={() => setMostrarFiltrosMobile(false)}>
              <Ionicons name="close" size={24} color={colors.ink} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.lg }}>{painelFiltros}</ScrollView>
          <TouchableOpacity style={styles.aplicarBotao} onPress={() => setMostrarFiltrosMobile(false)}>
            <Text style={styles.buscaBotaoTexto}>Ver resultados</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.canvas },
    cabecalho: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm },
    voltar: { alignSelf: "flex-start" },
    buscaLinha: { flexDirection: "row", gap: spacing.sm },
    buscaInput: {
      flex: 1,
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.ink,
    },
    buscaBotao: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      justifyContent: "center",
    },
    buscaBotaoTexto: { color: colors.white, fontWeight: "700", fontSize: 13 },
    filtrosBotaoMobile: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
    filtrosBotaoMobileTexto: { color: colors.primary, fontWeight: "700", fontSize: 13 },
    corpo: { flex: 1, flexDirection: "row", paddingHorizontal: spacing.lg, gap: spacing.lg },
    corpoWide: { maxWidth: 1100, alignSelf: "center", width: "100%" },
    sidebar: { width: 240, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, alignSelf: "flex-start" },
    listaContainer: { flex: 1 },
    resultadoTitulo: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
    vazio: { color: colors.muted, textAlign: "center", marginTop: spacing.xl },
    modalCabecalho: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    aplicarBotao: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      margin: spacing.lg,
    },
  });
}
