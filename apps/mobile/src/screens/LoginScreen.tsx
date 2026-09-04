import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { ApiClientError } from "@/lib/api";
import { formatarCpf } from "@/lib/format";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { colors, radius, spacing } from "@/theme";

export function LoginScreen({ onCriarConta }: { onCriarConta: () => void }) {
  const { entrar, entrarComGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [googleCpf, setGoogleCpf] = useState("");
  const [concluindoGoogle, setConcluindoGoogle] = useState(false);

  async function handleEntrar() {
    setErro(null);
    setCarregando(true);
    try {
      await entrar(email, senha);
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível entrar");
    } finally {
      setCarregando(false);
    }
  }

  async function concluirCadastroGoogle() {
    if (!googleIdToken) return;
    if (googleCpf.replace(/\D/g, "").length !== 11) {
      setErro("CPF deve conter 11 dígitos");
      return;
    }
    setErro(null);
    setConcluindoGoogle(true);
    try {
      await entrarComGoogle(googleIdToken, googleCpf.replace(/\D/g, ""));
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível concluir o cadastro");
    } finally {
      setConcluindoGoogle(false);
    }
  }

  if (googleIdToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Quase lá!</Text>
          <Text style={styles.subtitle}>Precisamos do seu CPF pra concluir o cadastro.</Text>

          <Text style={styles.label}>CPF</Text>
          <TextInput
            style={styles.input}
            value={googleCpf}
            onChangeText={(v) => setGoogleCpf(formatarCpf(v))}
            placeholder="000.000.000-00"
            keyboardType="numeric"
            maxLength={14}
            placeholderTextColor={colors.muted}
          />

          {erro && <Text style={styles.erro}>{erro}</Text>}

          <TouchableOpacity style={styles.botaoPrimario} onPress={concluirCadastroGoogle} disabled={concluindoGoogle}>
            {concluindoGoogle ? <ActivityIndicator color={colors.white} /> : <Text style={styles.botaoPrimarioTexto}>Concluir</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setGoogleIdToken(null); setErro(null); }}>
            <Text style={styles.rodape}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>H</Text>
        </View>
        <Text style={styles.title}>Help</Text>
        <Text style={styles.subtitle}>Bem-vindo de volta. Acesse sua conta.</Text>

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

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          value={senha}
          onChangeText={setSenha}
          placeholder="••••••••"
          secureTextEntry
          placeholderTextColor={colors.muted}
        />

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <TouchableOpacity style={styles.botaoPrimario} onPress={handleEntrar} disabled={carregando}>
          {carregando ? <ActivityIndicator color={colors.white} /> : <Text style={styles.botaoPrimarioTexto}>Entrar</Text>}
        </TouchableOpacity>

        {!!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
            <View style={styles.divisorLinha}>
              <View style={styles.divisorTraco} />
              <Text style={styles.divisorTexto}>ou</Text>
              <View style={styles.divisorTraco} />
            </View>

            <GoogleSignInButton onPrecisaCpf={setGoogleIdToken} onErro={setErro} />
          </>
        )}

        <TouchableOpacity onPress={onCriarConta}>
          <Text style={styles.rodape}>Ainda não tem conta? Criar conta</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, justifyContent: "center", padding: spacing.lg },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, width: "100%", maxWidth: 420, alignSelf: "center" },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  logoText: { color: colors.white, fontSize: 24, fontWeight: "700" },
  title: { textAlign: "center", fontSize: 22, fontWeight: "700", color: colors.primary },
  subtitle: { textAlign: "center", color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { fontSize: 12, color: colors.muted, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    color: colors.ink,
  },
  erro: { color: "#C62828", marginBottom: spacing.sm },
  botaoPrimario: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  botaoPrimarioTexto: { color: colors.white, fontWeight: "700" },
  divisorLinha: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  divisorTraco: { flex: 1, height: 1, backgroundColor: colors.border },
  divisorTexto: { color: colors.muted, fontSize: 12 },
  rodape: { textAlign: "center", color: colors.primary, marginTop: spacing.lg, fontSize: 13 },
});
