import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LoginScreen } from "@/screens/LoginScreen";
import { RegisterScreen } from "@/screens/RegisterScreen";
import { MainTabs } from "@/navigation/MainTabs";
import { colors } from "@/theme";

// Nomes de rota (não o `options.title` da aba) é o que o React Navigation
// usa por padrão pro <title> da aba do navegador — por isso aparecia
// "HomeMain" em vez de um nome amigável. Mapeamos aqui explicitamente.
const TITULOS_ROTA: Record<string, string> = {
  Home: "Help",
  HomeMain: "Help",
  NewRequest: "Nova Solicitação · Help",
  Recebidos: "Solicitações Recebidas · Help",
  Orders: "Meus Pedidos · Help",
  Trabalhos: "Meus Trabalhos · Help",
  Chat: "Chat · Help",
  Profile: "Perfil · Help",
};

function Root() {
  const { usuario, carregando } = useAuth();
  const [tela, setTela] = useState<"login" | "registro">("login");

  if (carregando) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (usuario) {
    return <MainTabs />;
  }

  return tela === "login" ? (
    <LoginScreen onCriarConta={() => setTela("registro")} />
  ) : (
    <RegisterScreen onVoltarLogin={() => setTela("login")} />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer
          documentTitle={{
            formatter: (options, route) => TITULOS_ROTA[route?.name ?? ""] ?? options?.title ?? "Help",
          }}
        >
          <StatusBar style="dark" />
          <Root />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
