interface EnderecoParaGeocodificar {
  rua: string;
  numero?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

// Nominatim (OpenStreetMap): geocodificação gratuita, sem chave/credencial.
// Exige um User-Agent identificando a aplicação (política de uso deles) e
// no máximo ~1 requisição/segundo — tranquilo pro volume desse app (uma
// chamada por endereço cadastrado).
export async function geocodificarEndereco(
  endereco: EnderecoParaGeocodificar
): Promise<{ latitude: number; longitude: number } | null> {
  const partesEndereco = [
    [endereco.rua, endereco.numero].filter(Boolean).join(", "),
    endereco.bairro,
    endereco.cidade,
    endereco.estado,
    "Brasil",
  ].filter(Boolean);

  const tentativas = [partesEndereco.join(", "), `${endereco.cep}, Brasil`];

  for (const consulta of tentativas) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("q", consulta);

    const resposta = await fetch(url, {
      headers: { "User-Agent": "HelpMateApp/1.0 (suporte@helpmate.com.br)" },
    });
    if (!resposta.ok) continue;

    const resultados = (await resposta.json()) as Array<{ lat: string; lon: string }>;
    if (resultados.length > 0) {
      return { latitude: Number(resultados[0].lat), longitude: Number(resultados[0].lon) };
    }
  }

  return null;
}
