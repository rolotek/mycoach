export interface LLMProvider {
  id: string;
  name: string;
  models: LLMModel[];
}

export interface LLMModel {
  id: string;
  name: string;
  providerId: string;
}
