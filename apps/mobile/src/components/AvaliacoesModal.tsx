import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch } from "@/lib/api";
import { AvaliacaoBadge } from "@/components/AvaliacaoBadge";
import { corAvaliacao } from "@/lib/rating";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";

interface Avaliacao {
  id: string;
  nota: number;
  comentario: string | null;
  criadoEm: string;
  avaliador: { nome: string };
}

interface Props {
  visivel: boolean;
  usuarioId: string;
  nome: string;
  notaMedia: number;
  onFechar: () => void;
}

export function AvaliacoesModal({ visivel, usuarioId, nome, notaMedia, onFechar }: Props) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => criarStyles(colors), [colors]);

  useEffect(() => {
    if (!visivel) return;
    setCarregando(true);
    apiFetch<Avaliacao[]>(`/avaliacoes/usuario/${usuarioId}`)
      .then(setAvaliacoes)
      .catch(() => setAvaliacoes([]))
      .finally(() => setCarregando(false));
  }, [visivel, usuarioId]);

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.cabecalho}>
            <View style={styles.cabecalhoTextos}>
              <Text style={styles.nome}>{nome}</Text>
              <AvaliacaoBadge nota={notaMedia} tamanhoEstrela={18} tamanhoTexto={16} />
            </View>
            <TouchableOpacity onPress={onFechar} accessibilityRole="button" accessibilityLabel="Fechar">
              <Ionicons name="close" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {carregando ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <ScrollView style={styles.lista} contentContainerStyle={{ gap: spacing.md }}>
              {avaliacoes.length === 0 && <Text style={styles.vazio}>Ainda não tem nenhuma avaliação.</Text>}
              {avaliacoes.map((a) => (
                <View key={a.id} style={styles.item}>
                  <View style={styles.itemCabecalho}>
                    <Text style={styles.itemNome}>{a.avaliador.nome}</Text>
                    <View style={styles.itemEstrelas}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Ionicons
                          key={n}
                          name={n <= a.nota ? "star" : "star-outline"}
                          size={13}
                          color={n <= a.nota ? corAvaliacao(a.nota) : colors.border}
                        />
                      ))}
                    </View>
                  </View>
                  {a.comentario && <Text style={styles.itemComentario}>{a.comentario}</Text>}
                  <Text style={styles.itemData}>{new Date(a.criadoEm).toLocaleDateString("pt-BR")}</Text>
                </View>
              ))}
            </ScrollView>
          )}
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
      maxWidth: 420,
      maxHeight: "80%",
    },
    cabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.md },
    cabecalhoTextos: { gap: 4 },
    nome: { fontSize: 17, fontWeight: "700", color: colors.ink },
    lista: { marginTop: spacing.xs },
    vazio: { color: colors.muted, textAlign: "center", paddingVertical: spacing.lg },
    item: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.md },
    itemCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    itemNome: { fontWeight: "700", color: colors.ink, fontSize: 13 },
    itemEstrelas: { flexDirection: "row", gap: 2 },
    itemComentario: { color: colors.ink, fontSize: 13, marginTop: spacing.xs },
    itemData: { color: colors.muted, fontSize: 11, marginTop: spacing.xs },
  });
}
