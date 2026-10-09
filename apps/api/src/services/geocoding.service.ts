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

// Reverso: coordenadas -> nome da cidade. Usado pra mostrar "Atende:
// <cidade> e região" no perfil público do autônomo, sem precisar guardar
// (ou inventar) uma lista de cidades atendidas — é a cidade de verdade de
// onde ele está, calculada a partir da mesma lat/long usada no matching.
export async function geocodificarReverso(
  latitude: number,
  longitude: number
): Promise<{ cidade: string; estado: string } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "json");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("zoom", "10");

  const resposta = await fetch(url, {
    headers: { "User-Agent": "HelpMateApp/1.0 (suporte@helpmate.com.br)" },
  });
  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as {
    address?: { city?: string; town?: string; village?: string; municipality?: string; state?: string };
  };
  const cidade = dados.address?.city ?? dados.address?.town ?? dados.address?.village ?? dados.address?.municipality;
  if (!cidade || !dados.address?.state) return null;

  return { cidade, estado: dados.address.state };
}

// Geocodifica só "cidade, UF" (sem rua/CEP) — usado pelo filtro de
// localização do diretório público de profissionais.
export async function geocodificarCidade(
  cidade: string,
  estado?: string
): Promise<{ latitude: number; longitude: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("q", [cidade, estado, "Brasil"].filter(Boolean).join(", "));

  const resposta = await fetch(url, {
    headers: { "User-Agent": "HelpMateApp/1.0 (suporte@helpmate.com.br)" },
  });
  if (!resposta.ok) return null;

  const resultados = (await resposta.json()) as Array<{ lat: string; lon: string }>;
  if (resultados.length === 0) return null;
  return { latitude: Number(resultados[0].lat), longitude: Number(resultados[0].lon) };
}
