import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LoginScreen } from "@/screens/LoginScreen";
import { RegisterScreen } from "@/screens/RegisterScreen";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

interface Props {
  visivel: boolean;
  modoInicial: "login" | "registro";
  onFechar: () => void;
  onEsqueciSenha: () => void;
}

// Modal de autenticação sobre a landing page (em vez de navegar pra uma
// tela cheia) — reaproveita LoginScreen/RegisterScreen com
// `semEnvoltorio`, só trocando o SafeAreaView de tela cheia por este
// cartão flutuante sobre um fundo escurecido.
export function AuthModal({ visivel, modoInicial, onFechar, onEsqueciSenha }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [modo, setModo] = useState<"login" | "registro">(modoInicial);

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <Pressable style={styles.fundo} onPress={onFechar}>
        <Pressable style={styles.cartao} onPress={(e) => e.stopPropagation()}>
          <TouchableOpacity style={styles.fechar} onPress={onFechar} accessibilityLabel="Fechar">
            <Ionicons name="close" size={22} color={colors.muted} />
          </TouchableOpacity>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            {modo === "login" ? (
              <LoginScreen
                semEnvoltorio
                onCriarConta={() => setModo("registro")}
                onEsqueciSenha={() => {
                  onFechar();
                  onEsqueciSenha();
                }}
              />
            ) : (
              <RegisterScreen semEnvoltorio onVoltarLogin={() => setModo("login")} />
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    fundo: {
      flex: 1,
      backgroundColor: "rgba(16,24,40,0.55)",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    cartao: {
      width: "100%",
      maxWidth: 440,
      maxHeight: "90%",
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      overflow: "hidden",
    },
    fechar: {
      position: "absolute",
      top: spacing.sm,
      right: spacing.sm,
      zIndex: 1,
      padding: spacing.xs,
    },
    scroll: { padding: spacing.lg },
  });
}
