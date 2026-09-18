import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch, ApiClientError } from "@/lib/api";
import { colors, radius, spacing } from "@/theme";

const SENHA_FORTE_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

interface Props {
  email: string;
  tokenInicial?: string;
  onConcluido: () => void;
  onVoltar: () => void;
}

export function ResetPasswordScreen({ email, tokenInicial, onConcluido, onVoltar }: Props) {
  const [token, setToken] = useState(tokenInicial ?? "");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleRedefinir() {
    setErro(null);

    if (token.trim().length !== 6) {
      setErro("Digite o código de 6 dígitos");
      return;
    }
    if (!SENHA_FORTE_REGEX.test(novaSenha)) {
      setErro("A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem");
      return;
    }

    setCarregando(true);
    try {
      await apiFetch("/auth/resetar-senha", {
        method: "POST",
        body: JSON.stringify({ email, token: token.trim(), novaSenha }),
      });
      setSucesso(true);
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível redefinir a senha");
    } finally {
      setCarregando(false);
    }
  }

  if (sucesso) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Senha redefinida!</Text>
          <Text style={styles.subtitle}>Já dá pra entrar com a nova senha.</Text>
          <TouchableOpacity style={styles.botaoPrimario} onPress={onConcluido}>
            <Text style={styles.botaoPrimarioTexto}>Ir para o login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Digite o código</Text>
        <Text style={styles.subtitle}>
          Enviamos um código de 6 dígitos pra <Text style={styles.subtitleDestaque}>{email}</Text>. Confira sua caixa
          de entrada (e o spam) e digite ele abaixo.
        </Text>

        <Text style={styles.label}>Código</Text>
        <TextInput
          style={[styles.input, styles.inputCodigo]}
          value={token}
          onChangeText={(v) => setToken(v.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          placeholderTextColor={colors.muted}
          accessibilityLabel="Código de 6 dígitos"
        />

        <Text style={styles.label}>Nova senha</Text>
        <TextInput
          style={styles.input}
          value={novaSenha}
          onChangeText={setNovaSenha}
          placeholder="Mínimo 8 caracteres"
          secureTextEntry
          placeholderTextColor={colors.muted}
          accessibilityLabel="Nova senha"
        />
        <Text style={styles.dica}>Use maiúscula, minúscula, número e caractere especial</Text>

        <Text style={styles.label}>Confirmar nova senha</Text>
        <TextInput
          style={styles.input}
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          placeholder="••••••••"
          secureTextEntry
          placeholderTextColor={colors.muted}
          accessibilityLabel="Confirmar nova senha"
        />

        {erro && <Text style={styles.erro} accessibilityRole="alert">{erro}</Text>}

        <TouchableOpacity
          style={styles.botaoPrimario}
          onPress={handleRedefinir}
          disabled={carregando}
          accessibilityRole="button"
          accessibilityLabel="Redefinir senha"
        >
          {carregando ? <ActivityIndicator color={colors.white} /> : <Text style={styles.botaoPrimarioTexto}>Redefinir senha</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={onVoltar} accessibilityRole="button" accessibilityLabel="Não recebeu? Pedir novo código">
          <Text style={styles.rodape}>Não recebeu? Pedir novo código</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, justifyContent: "center", padding: spacing.lg },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, padding: spacing.lg, width: "100%", maxWidth: 420, alignSelf: "center" },
  title: { textAlign: "center", fontSize: 22, fontWeight: "700", color: colors.primary },
  subtitle: { textAlign: "center", color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  subtitleDestaque: { color: colors.ink, fontWeight: "700" },
  label: { fontSize: 12, color: colors.muted, marginBottom: spacing.xs },
  dica: { fontSize: 11, color: colors.muted, marginTop: -spacing.sm, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    color: colors.ink,
  },
  inputCodigo: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 12,
    textAlign: "center",
    color: colors.primary,
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
  rodape: { textAlign: "center", color: colors.primary, marginTop: spacing.lg, fontSize: 13 },
});
