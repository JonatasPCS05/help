import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch, ApiClientError } from "@/lib/api";
import { colors, radius, spacing } from "@/theme";
import { paraDataISO } from "@/lib/data";
import { DatePickerField } from "@/components/DatePickerField";
import { ResponsiveContent } from "@/components/ResponsiveContent";

interface Categoria {
  id: string;
  nome: string;
}

interface Endereco {
  id: string;
  rua: string;
  bairro: string;
}

const NOVO_ENDERECO_INICIAL = {
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  cep: "",
  latitude: "-23.5505",
  longitude: "-46.6333",
};

// Formulário de nova solicitação (requisito 10): foto (TODO upload real),
// endereço, descrição e disponibilidade.
export function NewRequestScreen({ onEnviado, onCancelar }: { onEnviado: () => void; onCancelar: () => void }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [enderecoId, setEnderecoId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState<Date | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [mostrarNovoEndereco, setMostrarNovoEndereco] = useState(false);
  const [novoEndereco, setNovoEndereco] = useState(NOVO_ENDERECO_INICIAL);
  const [salvandoEndereco, setSalvandoEndereco] = useState(false);

  function carregarEnderecos() {
    return apiFetch<Endereco[]>("/usuarios/me/enderecos").then((lista) => {
      setEnderecos(lista);
      setEnderecoId((atual) => atual ?? lista[0]?.id ?? null);
      return lista;
    });
  }

  useEffect(() => {
    apiFetch<Categoria[]>("/categorias").then((lista) => {
      setCategorias(lista);
      setCategoriaId(lista[0]?.id ?? null);
    });
    carregarEnderecos();
  }, []);

  async function salvarEndereco() {
    if (!novoEndereco.rua || !novoEndereco.bairro || !novoEndereco.cidade || !novoEndereco.estado || !novoEndereco.cep) {
      setErro("Preencha todos os campos do endereço");
      return;
    }
    setErro(null);
    setSalvandoEndereco(true);
    try {
      const criado = await apiFetch<Endereco>("/usuarios/me/enderecos", {
        method: "POST",
        body: JSON.stringify({
          rua: novoEndereco.rua,
          numero: novoEndereco.numero || undefined,
          bairro: novoEndereco.bairro,
          cidade: novoEndereco.cidade,
          estado: novoEndereco.estado.toUpperCase(),
          cep: novoEndereco.cep,
          latitude: Number(novoEndereco.latitude),
          longitude: Number(novoEndereco.longitude),
        }),
      });
      await carregarEnderecos();
      setEnderecoId(criado.id);
      setNovoEndereco(NOVO_ENDERECO_INICIAL);
      setMostrarNovoEndereco(false);
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível salvar o endereço");
    } finally {
      setSalvandoEndereco(false);
    }
  }

  async function enviar() {
    if (!categoriaId || !enderecoId || !data) {
      setErro("Selecione categoria, endereço e data");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await apiFetch("/solicitacoes", {
        method: "POST",
        body: JSON.stringify({
          categoriaId,
          enderecoId,
          descricao,
          disponibilidade: [{ dia: paraDataISO(data), periodo: "manha" }],
        }),
      });
      onEnviado();
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível enviar a solicitação");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
      <ScrollView>
        <Text style={styles.titulo}>Nova Solicitação</Text>

        <Text style={styles.label}>Categoria</Text>
        <View style={styles.chips}>
          {categorias.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategoriaId(c.id)}
              style={[styles.chip, categoriaId === c.id && styles.chipAtivo]}
            >
              <Text style={[styles.chipTexto, categoriaId === c.id && styles.chipTextoAtivo]}>{c.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Endereço</Text>
        <View style={styles.chips}>
          {enderecos.map((e) => (
            <TouchableOpacity
              key={e.id}
              onPress={() => setEnderecoId(e.id)}
              style={[styles.chip, enderecoId === e.id && styles.chipAtivo]}
            >
              <Text style={[styles.chipTexto, enderecoId === e.id && styles.chipTextoAtivo]}>
                {e.rua} - {e.bairro}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.linkAdicionar}
          onPress={() => setMostrarNovoEndereco((atual) => !atual)}
        >
          <Text style={styles.linkAdicionarTexto}>
            {mostrarNovoEndereco ? "Cancelar novo endereço" : "+ Adicionar endereço"}
          </Text>
        </TouchableOpacity>

        {mostrarNovoEndereco && (
          <View style={styles.novoEnderecoCard}>
            <TextInput
              style={styles.input}
              value={novoEndereco.rua}
              onChangeText={(v) => setNovoEndereco((n) => ({ ...n, rua: v }))}
              placeholder="Rua"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              value={novoEndereco.numero}
              onChangeText={(v) => setNovoEndereco((n) => ({ ...n, numero: v }))}
              placeholder="Número"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              value={novoEndereco.bairro}
              onChangeText={(v) => setNovoEndereco((n) => ({ ...n, bairro: v }))}
              placeholder="Bairro"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              value={novoEndereco.cidade}
              onChangeText={(v) => setNovoEndereco((n) => ({ ...n, cidade: v }))}
              placeholder="Cidade"
              placeholderTextColor={colors.muted}
            />
            <TextInput
              style={styles.input}
              value={novoEndereco.estado}
              onChangeText={(v) => setNovoEndereco((n) => ({ ...n, estado: v }))}
              placeholder="UF (ex: SP)"
              placeholderTextColor={colors.muted}
              maxLength={2}
              autoCapitalize="characters"
            />
            <TextInput
              style={styles.input}
              value={novoEndereco.cep}
              onChangeText={(v) => setNovoEndereco((n) => ({ ...n, cep: v }))}
              placeholder="CEP"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
            />
            <Text style={styles.dica}>
              Latitude/longitude usadas pra localizar profissionais na região (ajuste se souber as coordenadas exatas).
            </Text>
            <TextInput
              style={styles.input}
              value={novoEndereco.latitude}
              onChangeText={(v) => setNovoEndereco((n) => ({ ...n, latitude: v }))}
              placeholder="Latitude"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
            <TextInput
              style={styles.input}
              value={novoEndereco.longitude}
              onChangeText={(v) => setNovoEndereco((n) => ({ ...n, longitude: v }))}
              placeholder="Longitude"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
            <TouchableOpacity style={styles.botaoPrimario} onPress={salvarEndereco} disabled={salvandoEndereco}>
              {salvandoEndereco ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.botaoPrimarioTexto}>Salvar endereço</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Descrição Detalhada</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Descreva o problema ou serviço necessário..."
          placeholderTextColor={colors.muted}
          multiline
        />

        <Text style={styles.label}>Data preferencial</Text>
        <DatePickerField value={data} onChange={setData} minimumDate={new Date()} style={styles.input} />

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <View style={styles.botoes}>
          <TouchableOpacity style={styles.botaoSecundario} onPress={onCancelar}>
            <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoPrimario} onPress={enviar} disabled={enviando}>
            {enviando ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.botaoPrimarioTexto}>Enviar Solicitação</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.md, marginBottom: spacing.lg },
  label: { fontSize: 12, color: colors.muted, marginBottom: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
  },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  chipTextoAtivo: { color: colors.white },
  vazio: { color: colors.muted, fontSize: 12 },
  linkAdicionar: { marginBottom: spacing.md },
  linkAdicionarTexto: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  novoEnderecoCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 0,
  },
  dica: { color: colors.muted, fontSize: 11, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    color: colors.ink,
  },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  erro: { color: "#C62828", marginBottom: spacing.sm },
  botoes: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xl },
  botaoSecundario: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  botaoSecundarioTexto: { color: colors.ink, fontWeight: "600" },
  botaoPrimario: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center" },
  botaoPrimarioTexto: { color: colors.white, fontWeight: "700" },
});
