import { EnergyRecord, ForecastResult } from '../types/energy';

export function forecastNext7Days(records: EnergyRecord[]): ForecastResult[] {
  if (records.length === 0) return [];

  // Find the last date in historical records
  const uniqueDates = Array.from(new Set(records.map(r => r.date))).sort();
  const lastDateStr = uniqueDates[uniqueDates.length - 1];
  const lastDate = new Date(`${lastDateStr}T00:00:00`);

  // Calculate overall trend: compare last 7 days vs previous 7 days
  const last7DaysRecords = records.filter(r => {
    const diffTime = lastDate.getTime() - new Date(`${r.date}T00:00:00`).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < 7;
  });

  const prev7DaysRecords = records.filter(r => {
    const diffTime = lastDate.getTime() - new Date(`${r.date}T00:00:00`).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 7 && diffDays < 14;
  });

  const last7Sum = last7DaysRecords.reduce((sum, r) => sum + r.consumption_kwh, 0);
  const prev7Sum = prev7DaysRecords.reduce((sum, r) => sum + r.consumption_kwh, 0);

  // Growth factor (clamped between -15% and +15% to avoid wild predictions)
  let trendFactor = 0;
  if (prev7Sum > 0) {
    trendFactor = (last7Sum - prev7Sum) / prev7Sum;
    trendFactor = Math.max(-0.15, Math.min(0.15, trendFactor));
  }

  // Group historical records by day-of-week (0-6) and hour (0-23) to compute averages
  const seasonalAverages: Record<number, Record<number, { sum: number; count: number }>> = {};
  for (let d = 0; d < 7; d++) {
    seasonalAverages[d] = {};
    for (let h = 0; h < 24; h++) {
      seasonalAverages[d][h] = { sum: 0, count: 0 };
    }
  }

  records.forEach(r => {
    const d = new Date(`${r.date}T00:00:00`).getDay();
    // Exclude week 3 compressor leak days 15-21 from baseline averages
    const isWeek3Leak = r.equipment === 'Compresores de Frío Ushuaia' && r.date >= '2026-05-15' && r.date <= '2026-05-21';
    
    if (!isWeek3Leak) {
      seasonalAverages[d][r.hour].sum += r.consumption_kwh;
      seasonalAverages[d][r.hour].count += 1;
    }
  });

  const forecastResults: ForecastResult[] = [];
  const costBase = records[records.length - 1]?.cost_per_kwh || 65.0;

  // Generate next 7 days
  for (let i = 1; i <= 7; i++) {
    const fDate = new Date(lastDate);
    fDate.setDate(lastDate.getDate() + i);
    const fDateStr = fDate.toISOString().split('T')[0];
    const fDayOfWeek = fDate.getDay();
    const isWeekend = fDayOfWeek === 0 || fDayOfWeek === 6;

    let dailyKwh = 0;

    // Sum up hourly predictions
    for (let h = 0; h < 24; h++) {
      const seasonal = seasonalAverages[fDayOfWeek][h];
      let hourlyAvg = seasonal.count > 0 ? (seasonal.sum / seasonal.count) : 10;
      
      // Apply trend growth factor
      hourlyAvg = hourlyAvg * (1 + trendFactor * (i / 7)); // gradual trend application

      // Add a tiny random variance (-5% to +5%)
      hourlyAvg = hourlyAvg * (1 + (Math.random() * 0.1 - 0.05));

      dailyKwh += hourlyAvg;
    }

    // Cost estimation
    const costEstimated = dailyKwh * costBase;

    // Risk assessment based on trend and weekends
    let risk_level: 'bajo' | 'medio' | 'alto' = 'bajo';
    if (trendFactor > 0.05 && !isWeekend) {
      risk_level = 'alto';
    } else if (trendFactor > 0.01 || (isWeekend && dailyKwh > 500)) {
      risk_level = 'medio';
    }

    // Determine recommendations
    const recommendations: string[] = [];
    if (isWeekend) {
      recommendations.push("Fin de semana: Apagar la calefacción eléctrica de soporte en oficinas públicas para reducir costos base.");
    } else {
      recommendations.push("Monitorear picos en el turno tarde (18:00 a 22:00 hs) para evitar recargos por potencia contratada en Río Grande.");
    }
    
    if (trendFactor > 0.03) {
      recommendations.push(`Tendencia alcista activa (+${(trendFactor * 100).toFixed(1)}%). Inspeccionar la Línea de Ensamblaje industrial por desvíos.`);
    } else {
      recommendations.push("Mantener pautas de climatización y programar el apagado automático de servidores ociosos.");
    }

    forecastResults.push({
      date: fDateStr,
      consumption_kwh: parseFloat(dailyKwh.toFixed(1)),
      cost_estimated: parseFloat(costEstimated.toFixed(2)),
      risk_level,
      recommendations
    });
  }

  return forecastResults;
}

export interface ForecastChartDataPoint {
  date: string;
  historical?: number;
  predicted?: number;
  lowerBound?: number;
  upperBound?: number;
}

export function getForecastChartData(records: EnergyRecord[], forecast: ForecastResult[]): ForecastChartDataPoint[] {
  const chartData: ForecastChartDataPoint[] = [];

  // Group historical records by date (take last 14 days)
  const dailyHistory: Record<string, number> = {};
  records.forEach(r => {
    dailyHistory[r.date] = (dailyHistory[r.date] || 0) + r.consumption_kwh;
  });

  const sortedHistoryDates = Object.keys(dailyHistory).sort();
  const last14Dates = sortedHistoryDates.slice(-14);

  last14Dates.forEach(dStr => {
    chartData.push({
      date: dStr,
      historical: parseFloat(dailyHistory[dStr].toFixed(1))
    });
  });

  // Add prediction data points
  forecast.forEach(f => {
    const base = f.consumption_kwh;
    chartData.push({
      date: f.date,
      predicted: base,
      // 5% margin of error for visualization shadow bands
      lowerBound: parseFloat((base * 0.94).toFixed(1)),
      upperBound: parseFloat((base * 1.06).toFixed(1))
    });
  });

  return chartData;
}
