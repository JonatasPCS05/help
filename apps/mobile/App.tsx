import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { LandingScreen } from "@/screens/LandingScreen";
import { LoginScreen } from "@/screens/LoginScreen";
import { RegisterScreen } from "@/screens/RegisterScreen";
import { ForgotPasswordScreen } from "@/screens/ForgotPasswordScreen";
import { ResetPasswordScreen } from "@/screens/ResetPasswordScreen";
import { MainTabs } from "@/navigation/MainTabs";
import { ConfirmModalHost } from "@/components/ConfirmModal";

// Nomes de rota (não o `options.title` da aba) é o que o React Navigation
// usa por padrão pro <title> da aba do navegador — por isso aparecia
// "HomeMain" em vez de um nome amigável. Mapeamos aqui explicitamente.
const TITULOS_ROTA: Record<string, string> = {
  Home: "HelpMate",
  HomeMain: "HelpMate",
  NewRequest: "Nova Solicitação · HelpMate",
  Recebidos: "Solicitações Recebidas · HelpMate",
  Orders: "Meus Pedidos · HelpMate",
  Trabalhos: "Meus Trabalhos · HelpMate",
  Chat: "Chat · HelpMate",
  Profile: "Perfil · HelpMate",
};

function Root() {
  const { usuario, carregando } = useAuth();
  const { colors } = useTheme();
  const [tela, setTela] = useState<"landing" | "login" | "registro" | "esqueci-senha" | "resetar-senha">("landing");
  const [emailReset, setEmailReset] = useState("");
  const [tokenReset, setTokenReset] = useState<string | undefined>(undefined);

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

  if (tela === "landing") {
    return <LandingScreen onEntrar={() => setTela("login")} />;
  }

  if (tela === "registro") {
    return <RegisterScreen onVoltarLogin={() => setTela("login")} />;
  }

  if (tela === "esqueci-senha") {
    return (
      <ForgotPasswordScreen
        onVoltarLogin={() => setTela("login")}
        onEnviado={(email, devToken) => {
          setEmailReset(email);
          setTokenReset(devToken);
          setTela("resetar-senha");
        }}
      />
    );
  }

  if (tela === "resetar-senha") {
    return (
      <ResetPasswordScreen
        email={emailReset}
        tokenInicial={tokenReset}
        onConcluido={() => setTela("login")}
        onVoltar={() => setTela("esqueci-senha")}
      />
    );
  }

  return <LoginScreen onCriarConta={() => setTela("registro")} onEsqueciSenha={() => setTela("esqueci-senha")} />;
}

function BarraDeStatus() {
  const { modo } = useTheme();
  return <StatusBar style={modo === "escuro" ? "light" : "dark"} />;
}

export default function App() {
  const [fontesCarregadas] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Fontes de peso específico (Inter) só são usadas pelas telas novas do
  // redesign a partir daqui — nada que já existia depende delas, então dá
  // pra liberar a UI assim que carregar, sem travar o app em caso de falha
  // de rede na primeira abertura (o texto só cai pra fonte padrão do SO).
  if (!fontesCarregadas) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAF9" }}>
        <ActivityIndicator color="#168A43" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer
            documentTitle={{
              formatter: (options, route) => TITULOS_ROTA[route?.name ?? ""] ?? options?.title ?? "HelpMate",
            }}
          >
            <BarraDeStatus />
            <Root />
            <ConfirmModalHost />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
