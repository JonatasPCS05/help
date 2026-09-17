export interface EnderecoPorCep {
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
}

// ViaCEP: API pública e gratuita de consulta de CEP, sem necessidade de
// chave/credencial. Retorna { erro: true } quando o CEP não existe.
export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoPorCep | null> {
  const cepLimpo = cep.replace(/\D/g, "");
  if (cepLimpo.length !== 8) return null;

  const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
  if (!resposta.ok) throw new Error("Não foi possível consultar o CEP");

  const dados = await resposta.json();
  if (dados.erro) return null;

  return {
    rua: dados.logradouro ?? "",
    bairro: dados.bairro ?? "",
    cidade: dados.localidade ?? "",
    estado: dados.uf ?? "",
  };
}
