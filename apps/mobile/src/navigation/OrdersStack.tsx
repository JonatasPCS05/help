import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OrdersScreen } from "@/screens/OrdersScreen";
import { SolicitacaoDetailScreen } from "@/screens/SolicitacaoDetailScreen";

export type OrdersStackParamList = {
  OrdersMain: undefined;
  SolicitacaoDetail: { id: string };
};

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export function OrdersStack({ papel }: { papel: "cliente" | "autonomo" }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrdersMain">
        {({ navigation }) => (
          <OrdersScreen
            papel={papel}
            onAbrirSolicitacao={(id) => navigation.navigate("SolicitacaoDetail", { id })}
          />
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
