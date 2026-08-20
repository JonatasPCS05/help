import { useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "@/theme";
import { paraDataISO } from "@/lib/data";

interface Props {
  value: Date | null;
  onChange: (data: Date) => void;
  minimumDate?: Date;
  style?: object;
}

// Versão iOS/Android: abre o seletor nativo do sistema operacional.
export function DatePickerField({ value, onChange, minimumDate, style }: Props) {
  const [mostrar, setMostrar] = useState(false);

  return (
    <>
      <TouchableOpacity style={style} onPress={() => setMostrar(true)}>
        <Text style={{ color: value ? colors.ink : colors.muted }}>
          {value ? paraDataISO(value) : "Toque para escolher a data"}
        </Text>
      </TouchableOpacity>
      {mostrar && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          minimumDate={minimumDate}
          onChange={(_evento, dataEscolhida) => {
            setMostrar(false);
            if (dataEscolhida) onChange(dataEscolhida);
          }}
        />
      )}
    </>
  );
}
