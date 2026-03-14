export type StageId = 'novo' | 'contato' | 'espera' | 'acompanhamento' | 'proposta' | 'fechado' | 'perdido';

export interface Stage {
  id: StageId;
  label: string;
  color: string; // tailwind class
  order: number;
}

export interface Client {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  formulario: string;
  lista: string;
  etapa: StageId;
  dataEntrada: string;
  ultimaInteracao: string;
  lembreteContato?: string | null;
  dataVenda?: string | null;
  produtoVendido?: "smart" | "mentoria" | null;
  valorVenda?: number | null;
  dayTradeStatus?: string | null;
  responsavel: string;
  origem: string;
  observacoes: string;
  tags: string[];
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  tipo: 'movimentacao' | 'nota' | 'whatsapp' | 'ligacao' | 'email';
  descricao: string;
  data: string;
  autor: string;
}

export interface MessageTemplate {
  id: string;
  etapa?: StageId;
  lista?: string;
  mensagem: string;
  nome: string;
}

export interface Activity {
  id: string;
  clienteNome: string;
  clienteId: string;
  tipo: string;
  descricao: string;
  data: string;
  responsavel: string;
}

export interface ClientAttachment {
  id: string;
  contactId: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}
