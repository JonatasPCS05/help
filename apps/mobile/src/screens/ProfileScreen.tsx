import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiClientError } from "@/lib/api";
import { colors, radius, spacing } from "@/theme";
import { ResponsiveContent } from "@/components/ResponsiveContent";
import { AvaliacaoBadge } from "@/components/AvaliacaoBadge";
import { confirmarAcao } from "@/lib/confirm";

interface Categoria {
  id: string;
  nome: string;
}

interface Props {
  onTornarAutonomo: () => void;
  onEditarPerfil: () => void;
  onAbrirHistorico: () => void;
  onAbrirPagamentos: () => void;
}

export function ProfileScreen({ onTornarAutonomo, onEditarPerfil, onAbrirHistorico, onAbrirPagamentos }: Props) {
  const { usuario, sair, recarregarUsuario } = useAuth();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [salvandoCategorias, setSalvandoCategorias] = useState(false);
  const [atualizandoOnline, setAtualizandoOnline] = useState(false);
  const [erroAutonomo, setErroAutonomo] = useState<string | null>(null);

  const carregarCategorias = useCallback(() => {
    if (!usuario?.isAutonomo) return;
    apiFetch<Categoria[]>("/categorias").then(setCategorias);
  }, [usuario?.isAutonomo]);

  useEffect(() => {
    carregarCategorias();
    setSelecionadas(usuario?.perfilAutonomo?.categorias.map((c) => c.categoria.id) ?? []);
  }, [carregarCategorias, usuario?.perfilAutonomo]);

  function confirmarSaida() {
    confirmarAcao("Sair da conta", "Tem certeza que deseja sair da sua conta?", sair);
  }

  function alternarCategoria(id: string) {
    setSelecionadas((atual) => (atual.includes(id) ? atual.filter((c) => c !== id) : [...atual, id]));
  }

  async function salvarCategorias() {
    setErroAutonomo(null);
    if (selecionadas.length === 0) {
      setErroAutonomo("Escolha pelo menos uma categoria");
      return;
    }
    setSalvandoCategorias(true);
    try {
      await apiFetch("/usuarios/me/autonomo/categorias", {
        method: "PUT",
        body: JSON.stringify({ categoriaIds: selecionadas }),
      });
      await recarregarUsuario();
    } catch (e) {
      setErroAutonomo(e instanceof ApiClientError ? e.message : "Não foi possível salvar as categorias");
    } finally {
      setSalvandoCategorias(false);
    }
  }

  async function alternarOnline(valor: boolean) {
    setErroAutonomo(null);
    setAtualizandoOnline(true);
    try {
      await apiFetch("/usuarios/me/autonomo/status", {
        method: "PATCH",
        body: JSON.stringify({ online: valor }),
      });
      await recarregarUsuario();
    } catch (e) {
      setErroAutonomo(e instanceof ApiClientError ? e.message : "Não foi possível atualizar seu status");
    } finally {
      setAtualizandoOnline(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ResponsiveContent>
        <View style={styles.header}>
          <View style={styles.avatar}>
            {usuario?.fotoUrl ? (
              <Image source={{ uri: usuario.fotoUrl }} style={styles.avatarImagem} />
            ) : (
              <Text style={styles.avatarTexto}>{usuario?.nome?.[0]?.toUpperCase() ?? "?"}</Text>
            )}
          </View>
          <Text style={styles.nome}>{usuario?.nome}</Text>
          <View style={styles.notasContainer}>
            {usuario?.isCliente && (
              <View style={styles.notaLinha}>
                <Text style={styles.notaLabel}>Como cliente</Text>
                <AvaliacaoBadge nota={usuario?.avaliacaoMediaCliente ?? 0} />
              </View>
            )}
            {usuario?.isAutonomo && (
              <View style={styles.notaLinha}>
                <Text style={styles.notaLabel}>Como autônomo</Text>
                <AvaliacaoBadge nota={usuario?.avaliacaoMediaAutonomo ?? 0} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.menu}>
          <TouchableOpacity onPress={onEditarPerfil}>
            <Text style={styles.menuItem}>Editar Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onAbrirHistorico}>
            <Text style={styles.menuItem}>Histórico</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onAbrirPagamentos}>
            <Text style={[styles.menuItem, styles.menuItemUltimo]}>Pagamentos</Text>
          </TouchableOpacity>
        </View>

        {usuario?.isAutonomo && (
          <View style={styles.autonomoCard}>
            <View style={styles.onlineLinha}>
              <View>
                <Text style={styles.autonomoTitulo}>Área do Autônomo</Text>
                <Text style={styles.onlineLabel}>{usuario.perfilAutonomo?.online ? "Online — recebendo pedidos" : "Offline"}</Text>
              </View>
              {atualizandoOnline ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Switch
                  value={usuario.perfilAutonomo?.online ?? false}
                  onValueChange={alternarOnline}
                  trackColor={{ true: colors.primary }}
                />
              )}
            </View>

            <Text style={styles.label}>Categorias de serviço</Text>
            <View style={styles.chips}>
              {categorias.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => alternarCategoria(c.id)}
                  style={[styles.chip, selecionadas.includes(c.id) && styles.chipAtivo]}
                >
                  <Text style={[styles.chipTexto, selecionadas.includes(c.id) && styles.chipTextoAtivo]}>{c.nome}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {erroAutonomo && <Text style={styles.erro}>{erroAutonomo}</Text>}

            <TouchableOpacity style={styles.botaoSalvarCategorias} onPress={salvarCategorias} disabled={salvandoCategorias}>
              {salvandoCategorias ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.botaoSalvarCategoriasTexto}>Salvar categorias</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {!usuario?.isAutonomo && (
          <View style={styles.ctaCard}>
            <TouchableOpacity style={styles.cta} onPress={onTornarAutonomo}>
              <Text style={styles.ctaTexto}>Quero ser Autônomo</Text>
            </TouchableOpacity>
            <Text style={styles.ctaSubtitulo}>
              Cadastre-se como prestador de serviços e aumente sua renda oferecendo seu trabalho para milhares de clientes.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.sair} onPress={confirmarSaida}>
          <Text style={styles.sairTexto}>Sair</Text>
        </TouchableOpacity>
      </ResponsiveContent>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.lg },
  header: { alignItems: "center", marginTop: spacing.lg, marginBottom: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  avatarImagem: { width: "100%", height: "100%" },
  avatarTexto: { fontSize: 28, fontWeight: "700", color: colors.primary },
  nome: { fontSize: 18, fontWeight: "700", color: colors.ink },
  notasContainer: { marginTop: spacing.sm, gap: 4, alignItems: "center" },
  notaLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  notaLabel: { color: colors.muted, fontSize: 12 },
  menu: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: "hidden" },
  menuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    color: colors.ink,
    fontWeight: "600",
  },
  menuItemUltimo: { borderBottomWidth: 0 },
  autonomoCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg },
  onlineLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  autonomoTitulo: { fontWeight: "700", color: colors.ink },
  onlineLabel: { color: colors.muted, fontSize: 12, marginTop: 2 },
  label: { fontSize: 12, color: colors.muted, marginBottom: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTexto: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  chipTextoAtivo: { color: colors.white },
  erro: { color: "#C62828", marginBottom: spacing.sm, fontSize: 12 },
  botaoSalvarCategorias: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: "center" },
  botaoSalvarCategoriasTexto: { color: colors.white, fontWeight: "700", fontSize: 13 },
  ctaCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg },
  cta: { backgroundColor: colors.secondary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center" },
  ctaTexto: { color: colors.white, fontWeight: "700" },
  ctaSubtitulo: { color: colors.muted, marginTop: spacing.sm, fontSize: 12 },
  sair: { marginTop: spacing.lg, alignItems: "center", paddingVertical: spacing.md },
  sairTexto: { color: colors.muted, fontWeight: "600" },
});
