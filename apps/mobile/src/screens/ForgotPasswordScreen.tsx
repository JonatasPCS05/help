import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch, ApiClientError } from "@/lib/api";
import { colors, radius, spacing } from "@/theme";

interface Props {
  onVoltarLogin: () => void;
  onEnviado: (email: string, devToken?: string) => void;
}

export function ForgotPasswordScreen({ onVoltarLogin, onEnviado }: Props) {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleEnviar() {
    setErro(null);
    if (!email.includes("@")) {
      setErro("Informe um e-mail válido");
      return;
    }

    setCarregando(true);
    try {
      const resp = await apiFetch<{ message: string; devToken?: string }>("/auth/esqueci-senha", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      onEnviado(email.trim(), resp.devToken);
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível enviar o código");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Esqueci minha senha</Text>
        <Text style={styles.subtitle}>
          Informe o e-mail da sua conta. Vamos te mandar um código de 6 dígitos pra redefinir a senha.
        </Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="seu@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={colors.muted}
          accessibilityLabel="E-mail"
        />

        {erro && <Text style={styles.erro} accessibilityRole="alert">{erro}</Text>}

        <TouchableOpacity
          style={styles.botaoPrimario}
          onPress={handleEnviar}
          disabled={carregando}
          accessibilityRole="button"
          accessibilityLabel="Enviar código"
        >
          {carregando ? <ActivityIndicator color={colors.white} /> : <Text style={styles.botaoPrimarioTexto}>Enviar código</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={onVoltarLogin} accessibilityRole="button" accessibilityLabel="Voltar pro login">
          <Text style={styles.rodape}>Voltar pro login</Text>
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
  rodape: { textAlign: "center", color: colors.primary, marginTop: spacing.lg, fontSize: 13 },
});
