import { useMemo, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiClientError } from "@/lib/api";
import { uploadImagem } from "@/lib/upload";
import { formatarTelefone } from "@/lib/format";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

const SENHA_FORTE_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function EditProfileScreen({ onVoltar }: { onVoltar: () => void }) {
  const { usuario, recarregarUsuario } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [telefone, setTelefone] = useState(usuario?.telefone ?? "");
  const [fotoUri, setFotoUri] = useState<string | null>(usuario?.fotoUrl ?? null);
  const [novaImagem, setNovaImagem] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Alterar senha: duas etapas — confirmar a senha atual primeiro, depois
  // o código de 6 dígitos que chega por e-mail (mesmo mecanismo do
  // "esqueci minha senha", só que autenticado).
  const [mostrarAlterarSenha, setMostrarAlterarSenha] = useState(false);
  const [etapaSenha, setEtapaSenha] = useState<"senha-atual" | "codigo">("senha-atual");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [codigoSenha, setCodigoSenha] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [processandoSenha, setProcessandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);

  function avisarSucesso(mensagem: string) {
    setSucesso(mensagem);
    setTimeout(() => setSucesso(null), 3000);
  }

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
    if (!email.includes("@")) {
      setErro("Informe um e-mail válido");
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
          email: email.trim(),
          telefone: telefone.replace(/\D/g, "") || undefined,
          ...(fotoUrl ? { fotoUrl } : {}),
        }),
      });
      await recarregarUsuario();
      avisarSucesso("Perfil atualizado!");
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível salvar as alterações");
    } finally {
      setSalvando(false);
    }
  }

  async function solicitarCodigoSenha() {
    setErroSenha(null);
    if (!senhaAtual) {
      setErroSenha("Informe sua senha atual");
      return;
    }
    setProcessandoSenha(true);
    try {
      await apiFetch("/usuarios/me/senha/solicitar-codigo", {
        method: "POST",
        body: JSON.stringify({ senhaAtual }),
      });
      setEtapaSenha("codigo");
    } catch (e) {
      setErroSenha(e instanceof ApiClientError ? e.message : "Não foi possível solicitar o código");
    } finally {
      setProcessandoSenha(false);
    }
  }

  async function confirmarAlteracaoSenha() {
    setErroSenha(null);
    if (codigoSenha.trim().length !== 6) {
      setErroSenha("Digite o código de 6 dígitos enviado pro seu e-mail");
      return;
    }
    if (!SENHA_FORTE_REGEX.test(novaSenha)) {
      setErroSenha("A nova senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial");
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErroSenha("As senhas não coincidem");
      return;
    }

    setProcessandoSenha(true);
    try {
      await apiFetch("/usuarios/me/senha/confirmar", {
        method: "POST",
        body: JSON.stringify({ token: codigoSenha.trim(), novaSenha }),
      });
      setMostrarAlterarSenha(false);
      setEtapaSenha("senha-atual");
      setSenhaAtual("");
      setCodigoSenha("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
      avisarSucesso("Senha alterada!");
    } catch (e) {
      setErroSenha(e instanceof ApiClientError ? e.message : "Não foi possível alterar a senha");
    } finally {
      setProcessandoSenha(false);
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
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.muted}
        />

        {erro && <Text style={styles.erro}>{erro}</Text>}
        {sucesso && <Text style={styles.sucesso}>{sucesso}</Text>}

        <TouchableOpacity style={styles.botaoPrimario} onPress={salvar} disabled={salvando}>
          {salvando ? <ActivityIndicator color={colors.white} /> : <Text style={styles.botaoPrimarioTexto}>Salvar</Text>}
        </TouchableOpacity>

        <View style={styles.separador} />

        {!mostrarAlterarSenha ? (
          <TouchableOpacity onPress={() => setMostrarAlterarSenha(true)}>
            <Text style={styles.linkAlterarSenha}>Alterar senha</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.cardSenha}>
            <Text style={styles.cardSenhaTitulo}>Alterar senha</Text>

            {etapaSenha === "senha-atual" ? (
              <>
                <Text style={styles.label}>Senha atual</Text>
                <TextInput
                  style={styles.input}
                  value={senhaAtual}
                  onChangeText={setSenhaAtual}
                  placeholder="••••••••"
                  secureTextEntry
                  placeholderTextColor={colors.muted}
                />
                {erroSenha && <Text style={styles.erro}>{erroSenha}</Text>}
                <View style={styles.botoesSenha}>
                  <TouchableOpacity
                    style={styles.botaoSecundario}
                    onPress={() => {
                      setMostrarAlterarSenha(false);
                      setErroSenha(null);
                      setSenhaAtual("");
                    }}
                  >
                    <Text style={styles.botaoSecundarioTexto}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.botaoPrimario, styles.flex1]}
                    onPress={solicitarCodigoSenha}
                    disabled={processandoSenha}
                  >
                    {processandoSenha ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.botaoPrimarioTexto}>Enviar código</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.dicaSenha}>Enviamos um código de 6 dígitos pro seu e-mail. Digite ele abaixo.</Text>

                <Text style={styles.label}>Código</Text>
                <TextInput
                  style={[styles.input, styles.inputCodigo]}
                  value={codigoSenha}
                  onChangeText={(v) => setCodigoSenha(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor={colors.muted}
                />

                <Text style={styles.label}>Nova senha</Text>
                <TextInput
                  style={styles.input}
                  value={novaSenha}
                  onChangeText={setNovaSenha}
                  placeholder="Mínimo 8 caracteres"
                  secureTextEntry
                  placeholderTextColor={colors.muted}
                />
                <Text style={styles.dica}>Use maiúscula, minúscula, número e caractere especial</Text>

                <Text style={styles.label}>Confirmar nova senha</Text>
                <TextInput
                  style={styles.input}
                  value={confirmarNovaSenha}
                  onChangeText={setConfirmarNovaSenha}
                  placeholder="••••••••"
                  secureTextEntry
                  placeholderTextColor={colors.muted}
                />

                {erroSenha && <Text style={styles.erro}>{erroSenha}</Text>}

                <View style={styles.botoesSenha}>
                  <TouchableOpacity
                    style={styles.botaoSecundario}
                    onPress={() => {
                      setEtapaSenha("senha-atual");
                      setErroSenha(null);
                    }}
                  >
                    <Text style={styles.botaoSecundarioTexto}>Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.botaoPrimario, styles.flex1]}
                    onPress={confirmarAlteracaoSenha}
                    disabled={processandoSenha}
                  >
                    {processandoSenha ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={styles.botaoPrimarioTexto}>Confirmar</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </ResponsiveContent>
    </SafeAreaView>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
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
  dica: { fontSize: 11, color: colors.muted, marginTop: -spacing.sm, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    color: colors.ink,
  },
  inputCodigo: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 10,
    textAlign: "center",
    color: colors.primary,
  },
  erro: { color: "#C62828", marginBottom: spacing.sm },
  sucesso: { color: colors.primary, fontWeight: "700", marginBottom: spacing.sm },
  botaoPrimario: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  botaoPrimarioTexto: { color: colors.white, fontWeight: "700" },
  separador: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  linkAlterarSenha: { textAlign: "center", color: colors.primary, fontWeight: "700", marginBottom: spacing.xl },
  cardSenha: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.xl },
  cardSenhaTitulo: { fontWeight: "700", color: colors.ink, marginBottom: spacing.md, fontSize: 15 },
  dicaSenha: { color: colors.muted, fontSize: 12.5, marginBottom: spacing.md },
  botoesSenha: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  flex1: { flex: 1 },
  botaoSecundario: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoSecundarioTexto: { color: colors.ink, fontWeight: "600" },
  });
}
