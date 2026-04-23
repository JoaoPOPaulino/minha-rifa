export type StatusNumero = "disponivel" | "reservado" | "pago";

export interface Comprador {
  nome: string;
  telefone: string;
}

export interface NumeroRifa {
  id: string;
  numero: number;
  lote_id: string;
  status: StatusNumero;
  comprador?: Comprador;
  comprador_dados?: Comprador;
  reservado_em?: Date | null;
  id_transacao_pix?: string;
}

export interface Lote {
  id: string;
  nome: string;
  range_inicio: number;
  range_fim: number;
  status: "ativo" | "finalizado" | "pausado";
  criado_em: Date;
}
