import { useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiClientError } from "@/lib/api";
import { uploadImagem } from "@/lib/upload";
import { formatarTelefone } from "@/lib/format";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { colors, radius, spacing } from "@/theme";

export function EditProfileScreen({ onVoltar }: { onVoltar: () => void }) {
  const { usuario, recarregarUsuario } = useAuth();
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [telefone, setTelefone] = useState(usuario?.telefone ?? "");
  const [fotoUri, setFotoUri] = useState<string | null>(usuario?.fotoUrl ?? null);
  const [novaImagem, setNovaImagem] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolherFoto() {
    setErro(null);
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro("Precisamos de acesso às suas fotos pra continuar");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!resultado.canceled) {
      setNovaImagem(resultado.assets[0]);
      setFotoUri(resultado.assets[0].uri);
    }
  }

  async function salvar() {
    setErro(null);
    if (nome.trim().length < 2) {
      setErro("Informe seu nome completo");
      return;
    }

    setSalvando(true);
    try {
      let fotoUrl: string | undefined;
      if (novaImagem) {
        const resultado = await uploadImagem({
          uri: novaImagem.uri,
          fileName: novaImagem.fileName,
          mimeType: novaImagem.mimeType,
          file: (novaImagem as unknown as { file?: File }).file,
        });
        fotoUrl = resultado.url;
      }

      await apiFetch("/usuarios/me", {
        method: "PATCH",
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.replace(/\D/g, "") || undefined,
          ...(fotoUrl ? { fotoUrl } : {}),
        }),
      });
      await recarregarUsuario();
      onVoltar();
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível salvar as alterações");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <TouchableOpacity onPress={onVoltar}>
          <Text style={styles.voltar}>{"< Voltar"}</Text>
        </TouchableOpacity>

        <Text style={styles.titulo}>Editar Perfil</Text>

        <TouchableOpacity style={styles.avatar} onPress={escolherFoto}>
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.avatarImagem} />
          ) : (
            <Text style={styles.avatarTexto}>{nome?.[0]?.toUpperCase() ?? "?"}</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.trocarFoto} onPress={escolherFoto}>
          Trocar foto
        </Text>

        <Text style={styles.label}>Nome completo</Text>
        <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholderTextColor={colors.muted} />

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={styles.input}
          value={telefone}
          onChangeText={(v) => setTelefone(formatarTelefone(v))}
          placeholder="(00) 00000-0000"
          keyboardType="numeric"
          maxLength={15}
          placeholderTextColor={colors.muted}
        />

        <Text style={styles.label}>E-mail</Text>
        <View style={styles.inputDesabilitado}>
          <Text style={styles.textoDesabilitado}>{usuario?.email}</Text>
        </View>

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <TouchableOpacity style={styles.botaoPrimario} onPress={salvar} disabled={salvando}>
          {salvando ? <ActivityIndicator color={colors.white} /> : <Text style={styles.botaoPrimarioTexto}>Salvar</Text>}
        </TouchableOpacity>
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  voltar: { color: colors.primary, fontWeight: "600", marginTop: spacing.md },
  titulo: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.sm, marginBottom: spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImagem: { width: "100%", height: "100%" },
  avatarTexto: { fontSize: 32, fontWeight: "700", color: colors.primary },
  trocarFoto: { textAlign: "center", color: colors.primary, fontWeight: "600", fontSize: 13, marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { fontSize: 12, color: colors.muted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    color: colors.ink,
  },
  inputDesabilitado: {
    backgroundColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  textoDesabilitado: { color: colors.muted },
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
