export enum OpenAIModel {
  DAVINCI_TURBO = "gpt-3.5-turbo",
}

export type PGEssay = {
  url: string;
  content: string;
  length: number;
  tokens: number;
  chunks: PGChunk[];
};

export type PGChunk = {
  essay_url: string;
  content: string;
  content_length: number;
  content_tokens: number;
  embedding: number[];
};

export type PGJSON = {
  url: string;
  length: number;
  tokens: number;
  essays: PGEssay[];
};
