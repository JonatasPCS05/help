import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { HomeStack } from "./HomeStack";
import { OrdersStack } from "./OrdersStack";
import { RecebidosStack } from "./RecebidosStack";
import { ChatStack } from "./ChatStack";
import { ProfileStack } from "./ProfileStack";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/context/AuthContext";
import { useResponsive } from "@/hooks/useResponsive";
import { colors } from "@/theme";

const Tab = createBottomTabNavigator();

// Nomes de ícones do Ionicons (@expo/vector-icons) — substituem os emojis
// que ficavam inconsistentes com os demais ícones vetoriais do app.
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: "home-outline",
  Recebidos: "file-tray-full-outline",
  Orders: "receipt-outline",
  Trabalhos: "briefcase-outline",
  Chat: "chatbubble-ellipses-outline",
  Profile: "person-outline",
};

const LABELS: Record<string, string> = {
  Home: "Home",
  Recebidos: "Recebidos",
  Orders: "Meus Pedidos",
  Trabalhos: "Trabalhos",
  Chat: "Chat",
  Profile: "Perfil",
};

// As abas mudam conforme o MODO ativo (não só a permissão bruta) — em
// modo autônomo mostramos os pedidos recebidos/trabalhos, em modo cliente
// mostramos os pedidos que a pessoa fez. Ver ModoSwitcher/AuthContext.
function telasDisponiveis(modo: "cliente" | "autonomo"): string[] {
  return modo === "autonomo"
    ? ["Home", "Recebidos", "Trabalhos", "Chat", "Profile"]
    : ["Home", "Orders", "Chat", "Profile"];
}

function renderizarTela(chave: string) {
  switch (chave) {
    case "Home":
      return <HomeStack />;
    case "Recebidos":
      return <RecebidosStack />;
    case "Orders":
      return <OrdersStack papel="cliente" />;
    case "Trabalhos":
      return <OrdersStack papel="autonomo" />;
    case "Chat":
      return <ChatStack />;
    case "Profile":
      return <ProfileStack />;
    default:
      return null;
  }
}

// Em telas largas (tablet/desktop na versão web) usamos um menu lateral
// fixo, no mesmo estilo do dashboard admin. Em telas estreitas (celular),
// mantemos a barra de abas embaixo — mesmas telas, layout diferente.
function DesktopShell() {
  const { modo } = useAuth();
  const telas = telasDisponiveis(modo);
  const [telaAtiva, setTelaAtiva] = useState(telas[0]);

  const itens = telas.map((chave) => ({ chave, label: LABELS[chave], icone: ICONS[chave] }));

  return (
    <View style={styles.desktopContainer}>
      <AppSidebar itens={itens} ativo={telaAtiva} onSelecionar={setTelaAtiva} />
      <View style={styles.desktopContent}>{renderizarTela(telaAtiva)}</View>
    </View>
  );
}

function MobileTabs() {
  const { modo } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: "Home" }} />
      {modo === "autonomo" && (
        <Tab.Screen name="Recebidos" component={RecebidosStack} options={{ title: "Recebidos" }} />
      )}
      {modo === "cliente" && (
        <Tab.Screen name="Orders" options={{ title: "Orders" }}>
          {() => <OrdersStack papel="cliente" />}
        </Tab.Screen>
      )}
      {modo === "autonomo" && (
        <Tab.Screen name="Trabalhos" options={{ title: "Trabalhos" }}>
          {() => <OrdersStack papel="autonomo" />}
        </Tab.Screen>
      )}
      <Tab.Screen name="Chat" component={ChatStack} options={{ title: "Chat" }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

export function MainTabs() {
  const { isWide } = useResponsive();
  return isWide ? <DesktopShell /> : <MobileTabs />;
}

const styles = StyleSheet.create({
  desktopContainer: { flex: 1, flexDirection: "row", backgroundColor: colors.canvas },
  desktopContent: { flex: 1 },
});
