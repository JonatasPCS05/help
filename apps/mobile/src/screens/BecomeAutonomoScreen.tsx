import { useCallback, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { apiFetch, ApiClientError } from "@/lib/api";
import { uploadImagem } from "@/lib/upload";
import { formatarCnpj } from "@/lib/format";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { colors, radius, spacing } from "@/theme";

interface SolicitacaoAutonomo {
  id: string;
  status: "pendente" | "aprovado" | "rejeitado";
  criadoEm: string;
}

const LABEL_STATUS: Record<string, string> = {
  pendente: "Em análise",
  aprovado: "Aprovada",
  rejeitado: "Não aprovada",
};

export function BecomeAutonomoScreen({ onVoltar }: { onVoltar: () => void }) {
  const [carregando, setCarregando] = useState(true);
  const [solicitacao, setSolicitacao] = useState<SolicitacaoAutonomo | null>(null);

  const [cnpj, setCnpj] = useState("");
  const [imagem, setImagem] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    apiFetch<SolicitacaoAutonomo | null>("/usuarios/me/solicitar-autonomo")
      .then(setSolicitacao)
      .catch(() => setSolicitacao(null))
      .finally(() => setCarregando(false));
  }, []);

  useFocusEffect(carregar);

  async function escolherImagem() {
    setErro(null);
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisamos de acesso às suas fotos pra continuar");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!resultado.canceled) {
      setImagem(resultado.assets[0]);
    }
  }

  async function enviar() {
    setErro(null);
    if (cnpj.replace(/\D/g, "").length !== 14) {
      setErro("CNPJ deve conter 14 dígitos");
      return;
    }
    if (!imagem) {
      setErro("Envie uma foto do documento do CNPJ");
      return;
    }

    setEnviando(true);
    try {
      const { url } = await uploadImagem({
        uri: imagem.uri,
        fileName: imagem.fileName,
        mimeType: imagem.mimeType,
        file: (imagem as unknown as { file?: File }).file,
      });
      await apiFetch("/usuarios/me/solicitar-autonomo", {
        method: "POST",
        body: JSON.stringify({ cnpj: cnpj.replace(/\D/g, ""), documentoCnpjUrl: url }),
      });
      carregar();
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível enviar sua solicitação");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.centro}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <ScrollView>
          <TouchableOpacity onPress={onVoltar}>
            <Text style={styles.voltar}>{"< Voltar"}</Text>
          </TouchableOpacity>

          <Text style={styles.titulo}>Tornar-se Autônomo</Text>

          {solicitacao?.status === "pendente" ? (
            <View style={styles.card}>
              <Text style={styles.statusTitulo}>Solicitação {LABEL_STATUS[solicitacao.status]}</Text>
              <Text style={styles.statusTexto}>
                Enviamos sua solicitação pra análise. Você recebe uma notificação assim que ela for avaliada.
              </Text>
            </View>
          ) : (
            <>
              {solicitacao?.status === "rejeitado" && (
                <View style={styles.avisoRejeitado}>
                  <Text style={styles.avisoRejeitadoTexto}>
                    Sua última solicitação não foi aprovada. Confira os dados e envie novamente.
                  </Text>
                </View>
              )}

              <Text style={styles.subtitulo}>
                Cadastre seu CNPJ e envie uma foto do documento pra começar a oferecer seus serviços.
              </Text>

              <Text style={styles.label}>CNPJ</Text>
              <TextInput
                style={styles.input}
                value={cnpj}
                onChangeText={(v) => setCnpj(formatarCnpj(v))}
                placeholder="00.000.000/0000-00"
                keyboardType="numeric"
                maxLength={18}
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Documento do CNPJ</Text>
              <TouchableOpacity style={styles.botaoImagem} onPress={escolherImagem}>
                {imagem ? (
                  <Image source={{ uri: imagem.uri }} style={styles.preview} resizeMode="cover" />
                ) : (
                  <Text style={styles.botaoImagemTexto}>Escolher foto</Text>
                )}
              </TouchableOpacity>

              {erro && <Text style={styles.erro}>{erro}</Text>}

              <TouchableOpacity style={styles.botaoPrimario} onPress={enviar} disabled={enviando}>
                {enviando ? <ActivityIndicator color={colors.white} /> : <Text style={styles.botaoPrimarioTexto}>Enviar solicitação</Text>}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  voltar: { color: colors.primary, fontWeight: "600", marginTop: spacing.md },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.md },
  subtitulo: { color: colors.muted, marginBottom: spacing.lg },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg },
  statusTitulo: { fontSize: 16, fontWeight: "700", color: colors.primary, marginBottom: spacing.xs },
  statusTexto: { color: colors.muted },
  avisoRejeitado: { backgroundColor: colors.tertiaryLight, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  avisoRejeitadoTexto: { color: colors.tertiary, fontSize: 13 },
  label: { fontSize: 12, color: colors.muted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    color: colors.ink,
  },
  botaoImagem: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  botaoImagemTexto: { color: colors.primary, fontWeight: "700" },
  preview: { width: "100%", height: "100%" },
  erro: { color: "#C62828", marginBottom: spacing.sm },
  botaoPrimario: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  botaoPrimarioTexto: { color: colors.white, fontWeight: "700" },
});
