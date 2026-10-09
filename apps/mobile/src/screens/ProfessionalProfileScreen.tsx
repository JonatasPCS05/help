import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AvaliacaoBadge } from "@/components/AvaliacaoBadge";
import { RatingBreakdownBars } from "@/components/RatingBreakdownBars";
import { radius, spacing, type Colors } from "@/theme";
import { useTheme } from "@/context/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";

interface PerfilPublico {
  id: string;
  usuario: { id: string; nome: string; fotoUrl: string | null };
  bio: string | null;
  online: boolean;
  avaliacaoMedia: number | string;
  totalAvaliacoes: number;
  porEstrela: Record<string, { quantidade: number; percentual: number }>;
  avaliacoesRecentes: { id: string; nota: number; comentario: string | null; criadoEm: string; avaliador: { nome: string } }[];
  categorias: { nome: string; precoBase: number | string | null }[];
  fotos: string[];
  regiaoAtendida: string | null;
}

interface Props {
  autonomoId: string;
  onVoltar: () => void;
  onPedirOrcamento: (categoriaNome: string) => void;
  onPrecisaEntrar: () => void;
}

export function ProfessionalProfileScreen({ autonomoId, onVoltar, onPedirOrcamento, onPrecisaEntrar }: Props) {
  const { colors } = useTheme();
  const { isWide } = useResponsive();
  const { usuario } = useAuth();
  const styles = useMemo(() => criarStyles(colors), [colors]);
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [favoritado, setFavoritado] = useState(false);
  const [alternandoFavorito, setAlternandoFavorito] = useState(false);

  useEffect(() => {
    setCarregando(true);
    apiFetch<PerfilPublico>(`/publico/autonomos/${autonomoId}`)
      .then(setPerfil)
      .catch(() => setPerfil(null))
      .finally(() => setCarregando(false));
  }, [autonomoId]);

  useEffect(() => {
    if (!usuario) return;
    apiFetch<{ autonomo: { id: string } }[]>("/favoritos")
      .then((lista) => setFavoritado(lista.some((f) => f.autonomo.id === autonomoId)))
      .catch(() => {});
  }, [usuario, autonomoId]);

  async function alternarFavorito() {
    if (!usuario) {
      onPrecisaEntrar();
      return;
    }
    setAlternandoFavorito(true);
    try {
      if (favoritado) {
        await apiFetch(`/favoritos/${autonomoId}`, { method: "DELETE" });
      } else {
        await apiFetch(`/favoritos/${autonomoId}`, { method: "POST" });
      }
      setFavoritado((atual) => !atual);
    } catch (e) {
      // silencioso -- favoritar é uma ação de conveniência, não crítica
    } finally {
      setAlternandoFavorito(false);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  if (!perfil) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ padding: spacing.lg }}>
          <TouchableOpacity onPress={onVoltar}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>
        </View>
        <Text style={styles.vazio}>Profissional não encontrado.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}>
        <TouchableOpacity onPress={onVoltar} style={styles.voltar}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </TouchableOpacity>

        <View style={styles.topo}>
          {perfil.usuario.fotoUrl ? (
            <Image source={{ uri: perfil.usuario.fotoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackTexto}>{perfil.usuario.nome[0]?.toUpperCase() ?? "?"}</Text>
            </View>
          )}
          <View style={styles.topoInfo}>
            {perfil.online && (
              <View style={styles.badgeOnline}>
                <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                <Text style={styles.badgeOnlineTexto}>Profissional verificado</Text>
              </View>
            )}
            <Text style={styles.nome}>{perfil.usuario.nome}</Text>
            <Text style={styles.categoriaPrincipal}>{perfil.categorias[0]?.nome}</Text>
            <View style={styles.linhaMeta}>
              <AvaliacaoBadge nota={perfil.avaliacaoMedia} />
              <Text style={styles.metaTexto}>({perfil.totalAvaliacoes} avaliações)</Text>
              {perfil.regiaoAtendida && (
                <View style={styles.linhaMeta}>
                  <Ionicons name="location-outline" size={14} color={colors.muted} />
                  <Text style={styles.metaTexto}>{perfil.regiaoAtendida}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.acoes}>
          <TouchableOpacity
            style={styles.botaoPrimario}
            onPress={() => {
              if (!usuario) {
                onPrecisaEntrar();
                return;
              }
              onPedirOrcamento(perfil.categorias[0]?.nome ?? "");
            }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.white} />
            <Text style={styles.botaoPrimarioTexto}>Solicitar orçamento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botaoSecundario} onPress={alternarFavorito} disabled={alternandoFavorito}>
            <Ionicons name={favoritado ? "heart" : "heart-outline"} size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.avisoOrcamento}>
          Sua solicitação é enviada pra profissionais da categoria disponíveis na sua região — não é garantido que
          seja {perfil.usuario.nome.split(" ")[0]} quem aceita.
        </Text>

        {perfil.bio && (
          <View style={styles.cartao}>
            <Text style={styles.secaoTitulo}>Sobre o profissional</Text>
            <Text style={styles.bioTexto}>{perfil.bio}</Text>
          </View>
        )}

        <View style={styles.cartao}>
          <Text style={styles.secaoTitulo}>Serviços oferecidos</Text>
          <View style={styles.servicosGrade}>
            {perfil.categorias.map((c) => (
              <View key={c.nome} style={styles.servicoItem}>
                <Text style={styles.servicoNome}>{c.nome}</Text>
                {c.precoBase !== null && (
                  <Text style={styles.servicoPreco}>A partir de R$ {Number(c.precoBase).toFixed(0)}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {perfil.fotos.length > 0 && (
          <View style={styles.cartao}>
            <Text style={styles.secaoTitulo}>Portfólio</Text>
            <View style={styles.portfolioGrade}>
              {perfil.fotos.map((url) => (
                <Image key={url} source={{ uri: url }} style={styles.portfolioFoto} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.cartao}>
          <Text style={styles.secaoTitulo}>Avaliações de clientes</Text>
          <View style={styles.avaliacaoResumo}>
            <View style={styles.avaliacaoNumero}>
              <Text style={styles.avaliacaoNumeroTexto}>{Number(perfil.avaliacaoMedia).toFixed(1)}</Text>
              <AvaliacaoBadge nota={perfil.avaliacaoMedia} />
              <Text style={styles.metaTexto}>{perfil.totalAvaliacoes} avaliações</Text>
            </View>
            <View style={{ flex: 1 }}>
              <RatingBreakdownBars resumo={{ total: perfil.totalAvaliacoes, porEstrela: perfil.porEstrela }} />
            </View>
          </View>

          {perfil.avaliacoesRecentes.map((av) => (
            <View key={av.id} style={styles.avaliacaoItem}>
              <View style={styles.avaliacaoItemCabecalho}>
                <Text style={styles.avaliacaoItemNome}>{av.avaliador.nome}</Text>
                <AvaliacaoBadge nota={av.nota} tamanhoEstrela={12} tamanhoTexto={11} />
              </View>
              {av.comentario && <Text style={styles.avaliacaoItemComentario}>{av.comentario}</Text>}
            </View>
          ))}
          {perfil.avaliacoesRecentes.length === 0 && <Text style={styles.vazio}>Ainda sem avaliações.</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function criarStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.canvas },
    scroll: { padding: spacing.lg, gap: spacing.md },
    scrollWide: { maxWidth: 760, alignSelf: "center", width: "100%" },
    voltar: { marginBottom: spacing.sm },
    vazio: { color: colors.muted, textAlign: "center", marginTop: spacing.xl },
    topo: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
    avatar: { width: 84, height: 84, borderRadius: radius.lg },
    avatarFallback: {
      width: 84,
      height: 84,
      borderRadius: radius.lg,
      backgroundColor: colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarFallbackTexto: { color: colors.primary, fontWeight: "700", fontSize: 30 },
    topoInfo: { flex: 1, gap: 2 },
    badgeOnline: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 2 },
    badgeOnlineTexto: { color: colors.primary, fontSize: 11, fontWeight: "700" },
    nome: { fontSize: 20, fontWeight: "700", color: colors.ink },
    categoriaPrincipal: { color: colors.muted, fontSize: 13, marginBottom: 4 },
    linhaMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
    metaTexto: { color: colors.muted, fontSize: 12 },
    acoes: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
    botaoPrimario: {
      flex: 1,
      flexDirection: "row",
      gap: spacing.xs,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
    },
    botaoPrimarioTexto: { color: colors.white, fontWeight: "700", fontSize: 13 },
    botaoSecundario: {
      width: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avisoOrcamento: { color: colors.muted, fontSize: 11, marginTop: -spacing.xs },
    cartao: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
    secaoTitulo: { fontSize: 15, fontWeight: "700", color: colors.ink },
    bioTexto: { color: colors.ink, fontSize: 13, lineHeight: 20 },
    servicosGrade: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    servicoItem: {
      backgroundColor: colors.canvas,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      minWidth: 140,
    },
    servicoNome: { fontSize: 13, fontWeight: "600", color: colors.ink },
    servicoPreco: { fontSize: 11, color: colors.muted, marginTop: 2 },
    portfolioGrade: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    portfolioFoto: { width: 100, height: 100, borderRadius: radius.sm },
    avaliacaoResumo: { flexDirection: "row", gap: spacing.lg, alignItems: "center" },
    avaliacaoNumero: { alignItems: "center", gap: 2, minWidth: 90 },
    avaliacaoNumeroTexto: { fontSize: 32, fontWeight: "700", color: colors.ink },
    avaliacaoItem: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, gap: 2 },
    avaliacaoItemCabecalho: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    avaliacaoItemNome: { fontWeight: "700", color: colors.ink, fontSize: 13 },
    avaliacaoItemComentario: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  });
}
