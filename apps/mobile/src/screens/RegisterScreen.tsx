import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { ApiClientError } from "@/lib/api";
import { formatarCpf, formatarTelefone } from "@/lib/format";
import { colors, radius, spacing } from "@/theme";

const SENHA_FORTE_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function RegisterScreen({ onVoltarLogin }: { onVoltarLogin: () => void }) {
  const { registrar } = useAuth();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleRegistrar() {
    setErro(null);

    if (nome.trim().length < 2) {
      setErro("Informe seu nome completo");
      return;
    }
    if (cpf.replace(/\D/g, "").length !== 11) {
      setErro("CPF deve conter 11 dígitos");
      return;
    }
    if (!SENHA_FORTE_REGEX.test(senha)) {
      setErro("A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem");
      return;
    }

    setCarregando(true);
    try {
      await registrar({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        cpf: cpf.replace(/\D/g, ""),
        telefone: telefone.replace(/\D/g, "") || undefined,
      });
    } catch (e) {
      setErro(e instanceof ApiClientError ? e.message : "Não foi possível criar a conta");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>H</Text>
          </View>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Leva menos de um minuto.</Text>

          <Text style={styles.label}>Nome completo</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Seu nome"
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

          <Text style={styles.label}>CPF</Text>
          <TextInput
            style={styles.input}
            value={cpf}
            onChangeText={(v) => setCpf(formatarCpf(v))}
            placeholder="000.000.000-00"
            keyboardType="numeric"
            maxLength={14}
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>Telefone (opcional)</Text>
          <TextInput
            style={styles.input}
            value={telefone}
            onChangeText={(v) => setTelefone(formatarTelefone(v))}
            placeholder="(00) 00000-0000"
            keyboardType="numeric"
            maxLength={15}
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            value={senha}
            onChangeText={setSenha}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.dica}>Use maiúscula, minúscula, número e caractere especial</Text>

          <Text style={styles.label}>Confirmar senha</Text>
          <TextInput
            style={styles.input}
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
            placeholder="••••••••"
            secureTextEntry
            placeholderTextColor={colors.muted}
          />

          {erro && <Text style={styles.erro}>{erro}</Text>}

          <TouchableOpacity style={styles.botaoPrimario} onPress={handleRegistrar} disabled={carregando}>
            {carregando ? <ActivityIndicator color={colors.white} /> : <Text style={styles.botaoPrimarioTexto}>Criar conta</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onVoltarLogin}>
            <Text style={styles.rodape}>Já tem conta? Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
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
