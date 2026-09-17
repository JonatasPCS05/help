import { useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "@/theme";

interface Props {
  value: Date | null;
  onChange: (data: Date) => void;
  minimumDate?: Date;
  style?: object;
}

function formatarDataHora(data: Date): string {
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Versão iOS/Android: não existe um modo único "data e hora" confiável nas
// duas plataformas do seletor nativo, então pedimos em duas etapas —
// primeiro a data, depois a hora — e combinamos num só Date.
export function DateTimePickerField({ value, onChange, minimumDate, style }: Props) {
  const [etapa, setEtapa] = useState<"data" | "hora" | null>(null);
  const [dataParcial, setDataParcial] = useState<Date | null>(null);

  return (
    <>
      <TouchableOpacity style={style} onPress={() => setEtapa("data")}>
        <Text style={{ color: value ? colors.ink : colors.muted }}>
          {value ? formatarDataHora(value) : "Toque para escolher data e hora"}
        </Text>
      </TouchableOpacity>
      {etapa === "data" && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          minimumDate={minimumDate}
          onChange={(_evento, dataEscolhida) => {
            if (!dataEscolhida) {
              setEtapa(null);
              return;
            }
            setDataParcial(dataEscolhida);
            setEtapa("hora");
          }}
        />
      )}
      {etapa === "hora" && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="time"
          onChange={(_evento, horaEscolhida) => {
            setEtapa(null);
            if (!horaEscolhida || !dataParcial) return;
            const combinada = new Date(dataParcial);
            combinada.setHours(horaEscolhida.getHours(), horaEscolhida.getMinutes(), 0, 0);
            onChange(combinada);
          }}
        />
      )}
    </>
  );
}
