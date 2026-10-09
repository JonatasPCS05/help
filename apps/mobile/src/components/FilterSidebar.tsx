import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

export interface FiltrosBusca {
  categoria: string | null;
  avaliacaoMinima: number | null;
  precoMax: number | null;
  disponivelHoje: boolean;
  ordenar: "avaliacao" | "preco" | "recentes";
}

interface Props {
  categorias: { id: string; nome: string }[];
  filtros: FiltrosBusca;
  onMudar: (filtros: FiltrosBusca) => void;
}

const FAIXAS_AVALIACAO = [4.5, 4, 3.5];
const FAIXAS_PRECO = [100, 150, 200, 300];
const OPCOES_ORDENACAO: { valor: FiltrosBusca["ordenar"]; label: string }[] = [
  { valor: "avaliacao", label: "Melhor avaliados" },
  { valor: "preco", label: "Menor preço" },
  { valor: "recentes", label: "Mais recentes" },
];

// Painel de filtros do diretório de profissionais -- o próprio
// BrowseProfessionalsScreen decide se isso aparece como coluna fixa
// (desktop) ou dentro de um modal/bottom-sheet (mobile); esse componente
// só cuida dos controles.
export function FilterSidebar({ categorias, filtros, onMudar }: Props) {
  const { colors } = useTheme();
  const styles = criarStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <Text style={styles.titulo}>Filtros</Text>
        <TouchableOpacity
          onPress={() =>
            onMudar({ categoria: null, avaliacaoMinima: null, precoMax: null, disponivelHoje: false, ordenar: "avaliacao" })
          }
        >
          <Text style={styles.limpar}>Limpar filtros</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.secao}>Ordenar por</Text>
      <View style={styles.chips}>
        {OPCOES_ORDENACAO.map((op) => (
          <TouchableOpacity
            key={op.valor}
            style={[styles.chip, filtros.ordenar === op.valor && styles.chipAtivo]}
            onPress={() => onMudar({ ...filtros, ordenar: op.valor })}
          >
            <Text style={[styles.chipTexto, filtros.ordenar === op.valor && styles.chipTextoAtivo]}>{op.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.linhaToggle}>
        <Text style={styles.secao}>Disponível hoje</Text>
        <Switch
          value={filtros.disponivelHoje}
          onValueChange={(v) => onMudar({ ...filtros, disponivelHoje: v })}
          trackColor={{ true: colors.primary }}
        />
      </View>

      <Text style={styles.secao}>Categoria</Text>
      <View style={styles.chips}>
        <TouchableOpacity
          style={[styles.chip, !filtros.categoria && styles.chipAtivo]}
          onPress={() => onMudar({ ...filtros, categoria: null })}
        >
          <Text style={[styles.chipTexto, !filtros.categoria && styles.chipTextoAtivo]}>Todas</Text>
        </TouchableOpacity>
        {categorias.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, filtros.categoria === c.nome && styles.chipAtivo]}
            onPress={() => onMudar({ ...filtros, categoria: c.nome })}
          >
            <Text style={[styles.chipTexto, filtros.categoria === c.nome && styles.chipTextoAtivo]}>{c.nome}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.secao}>Avaliação mínima</Text>
      <View style={styles.chips}>
        <TouchableOpacity
          style={[styles.chip, !filtros.avaliacaoMinima && styles.chipAtivo]}
          onPress={() => onMudar({ ...filtros, avaliacaoMinima: null })}
        >
          <Text style={[styles.chipTexto, !filtros.avaliacaoMinima && styles.chipTextoAtivo]}>Qualquer</Text>
        </TouchableOpacity>
        {FAIXAS_AVALIACAO.map((valor) => (
          <TouchableOpacity
            key={valor}
            style={[styles.chip, filtros.avaliacaoMinima === valor && styles.chipAtivo]}
            onPress={() => onMudar({ ...filtros, avaliacaoMinima: valor })}
          >
            <Text style={[styles.chipTexto, filtros.avaliacaoMinima === valor && styles.chipTextoAtivo]}>{valor}+ ★</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.secao}>Preço máximo</Text>
      <View style={styles.chips}>
        <TouchableOpacity
          style={[styles.chip, !filtros.precoMax && styles.chipAtivo]}
          onPress={() => onMudar({ ...filtros, precoMax: null })}
        >
          <Text style={[styles.chipTexto, !filtros.precoMax && styles.chipTextoAtivo]}>Qualquer</Text>
        </TouchableOpacity>
        {FAIXAS_PRECO.map((valor) => (
          <TouchableOpacity
            key={valor}
            style={[styles.chip, filtros.precoMax === valor && styles.chipAtivo]}
            onPress={() => onMudar({ ...filtros, precoMax: valor })}
          >
            <Text style={[styles.chipTexto, filtros.precoMax === valor && styles.chipTextoAtivo]}>até R${valor}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    container: { gap: spacing.sm },
    cabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
    titulo: { fontSize: 15, fontWeight: "700", color: colors.ink },
    limpar: { fontSize: 12, color: colors.primary, fontWeight: "600" },
    secao: { fontSize: 12, fontWeight: "700", color: colors.muted, marginTop: spacing.sm, textTransform: "uppercase" },
    linhaToggle: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      backgroundColor: colors.white,
    },
    chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipTexto: { fontSize: 12, color: colors.ink, fontWeight: "600" },
    chipTextoAtivo: { color: colors.white },
  });
}
