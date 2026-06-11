export interface Viagem {
  id: string;
  motorista_id: string;
  veiculo_id: string;
  status: 'planejada' | 'preparacao' | 'em_curso' | 'espera' | 'retorno' | 'finalizada' | 'cancelada';
  data: string;
  origem: string;
  destino: string;
  observacoes?: string;
  created_at: string;
}

export interface Passageiro {
  id: string;
  viagem_id: string;
  paciente_id: string;
  nome: string;
  status: 'pendente' | 'embarcado' | 'desembarcado' | 'ausente' | 'desistiu';
  registrado_em: string;
}

export interface GpsData {
  viagem_id: string;
  latitude: number;
  longitude: number;
  velocidade: number;
  direcao: number;
  timestamp_dispositivo: string;
  created_at: string;
}

export interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
  status: 'ativo' | 'inativo' | 'afastado';
}

export interface DatabaseSchema {
  viagens: Viagem[];
  motoristas: Motorista[];
  veiculos: any[];
  pacientes: any[];
  passageiros: Passageiro[];
  localizacoes: GpsData[];
  eventos: any[];
  alertas: any[];
  ocorrencias: any[];
  despesas: any[];
  syncLogs: any[];
}
