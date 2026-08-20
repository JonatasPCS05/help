import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { colors, radius, spacing } from "@/theme";

export interface SidebarItem {
  chave: string;
  label: string;
  icone: string;
}

interface Props {
  itens: SidebarItem[];
  ativo: string;
  onSelecionar: (chave: string) => void;
}

// Sidebar pra telas largas (tablet/desktop na versão web), no mesmo estilo
// visual do dashboard admin: logo circular + nome do app, itens de menu com
// o ativo destacado em laranja, "Sair" fixado embaixo.
export function AppSidebar({ itens, ativo, onSelecionar }: Props) {
  const { usuario, sair } = useAuth();

  return (
    <View style={styles.container}>
      <View>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoTexto}>H</Text>
          </View>
          <View>
            <Text style={styles.nomeApp}>Help</Text>
            <Text style={styles.subtitulo}>{usuario?.nome ?? ""}</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {itens.map((item) => {
            const ativoAtual = item.chave === ativo;
            return (
              <TouchableOpacity
                key={item.chave}
                onPress={() => onSelecionar(item.chave)}
                style={[styles.item, ativoAtual && styles.itemAtivo]}
              >
                <Text style={styles.itemIcone}>{item.icone}</Text>
                <Text style={[styles.itemTexto, ativoAtual && styles.itemTextoAtivo]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity style={styles.sair} onPress={sair}>
        <Text style={styles.sairTexto}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    justifyContent: "space-between",
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.lg, paddingHorizontal: spacing.xs },
  logo: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  logoTexto: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  nomeApp: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  subtitulo: { color: colors.muted, fontSize: 11 },
  menu: { gap: spacing.xs },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  itemAtivo: { backgroundColor: colors.secondary },
  itemIcone: { fontSize: 16, width: 20, textAlign: "center" },
  itemTexto: { color: colors.ink, fontWeight: "600", fontSize: 13 },
  itemTextoAtivo: { color: colors.white },
  sair: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  sairTexto: { color: colors.muted, fontWeight: "600", fontSize: 13 },
});
