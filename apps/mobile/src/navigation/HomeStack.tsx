import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "@/screens/HomeScreen";
import { NewRequestScreen } from "@/screens/NewRequestScreen";
import { BrowseProfessionalsScreen } from "@/screens/BrowseProfessionalsScreen";
import { ProfessionalProfileScreen } from "@/screens/ProfessionalProfileScreen";
import { useFavoritos } from "@/hooks/useFavoritos";

export type HomeStackParamList = {
  HomeMain: undefined;
  NewRequest: undefined;
  BuscaProfissionais: undefined;
  PerfilProfissional: { autonomoId: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

interface Props {
  // Navegação pro resto do app (abas Pedidos/Chat) funciona diferente no
  // desktop (troca de "tela ativa" manual, sem React Navigation) e no
  // mobile (Tab.Navigator de verdade) — por isso MainTabs injeta esses
  // callbacks já resolvidos do jeito certo pra cada layout, em vez do
  // HomeStack tentar adivinhar.
  onAbrirPedidos?: () => void;
  onAbrirChat?: () => void;
}

export function HomeStack({ onAbrirPedidos, onAbrirChat }: Props) {
  const { favoritosIds, alternar } = useFavoritos();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain">
        {({ navigation }) => (
          <HomeScreen
            onNovaSolicitacao={() => navigation.navigate("NewRequest")}
            onAbrirPedidos={onAbrirPedidos}
            onAbrirChat={onAbrirChat}
            onBuscarProfissionais={() => navigation.navigate("BuscaProfissionais")}
            onVerPerfilProfissional={(autonomoId) => navigation.navigate("PerfilProfissional", { autonomoId })}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="NewRequest">
        {({ navigation }) => (
          <NewRequestScreen onEnviado={() => navigation.goBack()} onCancelar={() => navigation.goBack()} />
        )}
      </Stack.Screen>
      <Stack.Screen name="BuscaProfissionais">
        {({ navigation }) => (
          <BrowseProfessionalsScreen
            onVoltar={() => navigation.goBack()}
            onVerPerfil={(autonomoId) => navigation.navigate("PerfilProfissional", { autonomoId })}
            onSolicitarOrcamento={() => navigation.navigate("NewRequest")}
            favoritosIds={favoritosIds}
            onAlternarFavorito={alternar}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="PerfilProfissional">
        {({ navigation, route }) => (
          <ProfessionalProfileScreen
            autonomoId={route.params.autonomoId}
            onVoltar={() => navigation.goBack()}
            onPedirOrcamento={() => navigation.navigate("NewRequest")}
            onPrecisaEntrar={() => {}}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
