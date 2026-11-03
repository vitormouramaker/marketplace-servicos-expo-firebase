const BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

export interface State {
  id: number;
  sigla: string;
  nome: string;
}

export interface City {
  id: number;
  nome: string;
}

export const getStates = async (): Promise<State[]> => {
  try {
    const response = await fetch(`${BASE_URL}/estados?orderBy=nome`);
    const data = await response.json();
    return data as State[];
  } catch (error) {
    console.error("Erro ao buscar estados:", error);
    return [];
  }
};

export const getCitiesByState = async (stateId: number): Promise<City[]> => {
  try {
    const response = await fetch(`${BASE_URL}/estados/${stateId}/municipios`);
    const data = await response.json();
    return data as City[];
  } catch (error) {
    console.error("Erro ao buscar cidades:", error);
    return [];
  }
};