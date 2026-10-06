import { useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

interface EstadoModal {
  titulo: string;
  mensagem: string;
  aoConfirmar: () => void;
}

// Substitui Alert.alert (nativo) e window.confirm (web, que mostra o
// diálogo cru do navegador, destoando completamente do resto do app) por
// um único modal com a cara do HelpMate nas duas plataformas. Mantido como
// função imperativa (em vez de hook) pra não precisar mudar nenhum dos
// pontos que já chamavam `confirmarAcao(titulo, mensagem, callback)`.
let acionarModal: ((estado: EstadoModal) => void) | null = null;

export function confirmarAcao(titulo: string, mensagem: string, aoConfirmar: () => void) {
  acionarModal?.({ titulo, mensagem, aoConfirmar });
}

export function ConfirmModalHost() {
  const [estado, setEstado] = useState<EstadoModal | null>(null);
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);

  useEffect(() => {
    acionarModal = setEstado;
    return () => {
      acionarModal = null;
    };
  }, []);

  function fechar() {
    setEstado(null);
  }

  function confirmar() {
    const aoConfirmar = estado?.aoConfirmar;
    setEstado(null);
    aoConfirmar?.();
  }

  return (
    <Modal visible={!!estado} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.titulo}>{estado?.titulo}</Text>
          <Text style={styles.mensagem}>{estado?.mensagem}</Text>
          <View style={styles.botoes}>
            <TouchableOpacity
              style={styles.botaoCancelar}
              onPress={fechar}
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
            >
              <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.botaoConfirmar}
              onPress={confirmar}
              accessibilityRole="button"
              accessibilityLabel="Confirmar"
            >
              <Text style={styles.botaoConfirmarTexto}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(26,26,26,0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      padding: spacing.lg,
      width: "100%",
      maxWidth: 360,
    },
    titulo: { fontSize: 17, fontWeight: "700", color: colors.ink, marginBottom: spacing.xs },
    mensagem: { fontSize: 14, color: colors.muted, marginBottom: spacing.lg, lineHeight: 20 },
    botoes: { flexDirection: "row", gap: spacing.sm },
    botaoCancelar: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    botaoCancelarTexto: { color: colors.ink, fontWeight: "600" },
    botaoConfirmar: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    botaoConfirmarTexto: { color: colors.white, fontWeight: "700" },
  });
}
