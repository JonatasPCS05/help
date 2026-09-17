import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { IncomingRequestsScreen } from "@/screens/IncomingRequestsScreen";
import { SolicitacaoDetailScreen } from "@/screens/SolicitacaoDetailScreen";

export type RecebidosStackParamList = {
  RecebidosMain: undefined;
  SolicitacaoDetail: { id: string };
};

const Stack = createNativeStackNavigator<RecebidosStackParamList>();

export function RecebidosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RecebidosMain">
        {({ navigation }) => (
          <IncomingRequestsScreen onAceito={(id) => navigation.navigate("SolicitacaoDetail", { id })} />
        )}
      </Stack.Screen>
      <Stack.Screen name="SolicitacaoDetail">
        {({ navigation, route }) => (
          <SolicitacaoDetailScreen solicitacaoId={route.params.id} onVoltar={() => navigation.goBack()} />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
