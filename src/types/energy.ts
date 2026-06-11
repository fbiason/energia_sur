export interface EnergyRecord {
  date: string; // YYYY-MM-DD
  hour: number; // 0-23
  sector: string;
  equipment: string;
  consumption_kwh: number;
  production_units: number;
  external_temperature: number;
  shift: 'Mañana' | 'Tarde' | 'Noche';
  cost_per_kwh: number;
  status: 'Operativo' | 'Mantenimiento' | 'Inactivo';
}

export interface Anomaly {
  id: string;
  timestamp: string; // YYYY-MM-DD HH:00
  sector: string;
  equipment: string;
  type: string;
  severity: 'baja' | 'media' | 'alta' | 'critica';
  explanation: string;
  recommendation: string;
  resolved: boolean;
}

export interface ForecastResult {
  date: string; // YYYY-MM-DD
  consumption_kwh: number;
  cost_estimated: number;
  risk_level: 'bajo' | 'medio' | 'alto';
  recommendations: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  dataSummary?: {
    type: 'metric' | 'chart' | 'list';
    title: string;
    content: string;
    chartData?: Record<string, string | number>[];
  };
}

export interface EfficiencyMetrics {
  name: string; // Sector or Equipment name
  kwh_per_unit: number;
  cost_per_unit: number;
  total_kwh: number;
  total_units: number;
  total_cost: number;
  efficiency_score: number; // 0 to 100
}

export interface ShiftMetrics {
  shift: 'Mañana' | 'Tarde' | 'Noche';
  total_kwh: number;
  total_units: number;
  kwh_per_unit: number;
  total_cost: number;
  hours_measured: number;
}
