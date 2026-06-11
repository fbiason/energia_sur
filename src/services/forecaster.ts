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

  // Growth factor (clamped to avoid extreme values)
  let trendFactor = 0;
  if (prev7Sum > 0) {
    trendFactor = (last7Sum - prev7Sum) / prev7Sum;
    trendFactor = Math.max(-0.15, Math.min(0.15, trendFactor));
  }

  // Calculate historical averages by day-of-week and hour
  const seasonalAverages: Record<number, Record<number, { sum: number; count: number }>> = {};
  for (let d = 0; d < 7; d++) {
    seasonalAverages[d] = {};
    for (let h = 0; h < 24; h++) {
      seasonalAverages[d][h] = { sum: 0, count: 0 };
    }
  }

  records.forEach(r => {
    const d = new Date(`${r.date}T00:00:00`).getDay();
    seasonalAverages[d][r.hour].sum += r.consumption_kwh;
    seasonalAverages[d][r.hour].count += 1;
  });

  // Calculate historical baseline average temperature in the last 7 days
  const last7DaysAvgTemp = last7DaysRecords.reduce((sum, r) => sum + r.external_temperature, 0) / (last7DaysRecords.length || 1);

  const forecastResults: ForecastResult[] = [];
  const costBase = records[records.length - 1]?.cost_per_kwh || 65.0;

  // Generate next 7 days (transitioning from late spring to summer)
  for (let i = 1; i <= 7; i++) {
    const fDate = new Date(lastDate);
    fDate.setDate(lastDate.getDate() + i);
    const fDateStr = fDate.toISOString().split('T')[0];
    const fDayOfWeek = fDate.getDay();
    const isWeekend = fDayOfWeek === 0 || fDayOfWeek === 6;

    // Project weather: getting warmer as summer approaches
    const tempProj = parseFloat((last7DaysAvgTemp + (i * 0.22) + (Math.random() * 1.5 - 0.75)).toFixed(1));
    const windProj = Math.round(30 + (Math.random() * 20 - 10)); // Windy spring
    const lightProj = parseFloat((14.0 + (i * 0.08)).toFixed(1)); // days are lengthening

    let dailyKwh = 0;

    // Sum up hourly predictions adjusted for climate forecast
    for (let h = 0; h < 24; h++) {
      const seasonal = seasonalAverages[fDayOfWeek][h];
      let hourlyAvg = seasonal.count > 0 ? (seasonal.sum / seasonal.count) : 12;
      
      // 1. Apply trend factor
      hourlyAvg = hourlyAvg * (1 + trendFactor * (i / 7));

      // 2. Adjust for temperature difference (warmer = less heating, slightly more refrigeration)
      const tempDiff = tempProj - last7DaysAvgTemp;
      // Heating saving coefficient (approx 3% reduction per degree Celsius warmer)
      if (tempDiff > 0) {
        hourlyAvg = hourlyAvg * (1 - tempDiff * 0.025);
      } else {
        hourlyAvg = hourlyAvg * (1 + Math.abs(tempDiff) * 0.025);
      }

      // 3. Add random noise (-3% to +3%)
      hourlyAvg = hourlyAvg * (1 + (Math.random() * 0.06 - 0.03));

      dailyKwh += hourlyAvg;
    }

    // Cost estimation
    const costEstimated = dailyKwh * costBase;

    // Risk assessment based on trend, wind and weekends
    let risk_level: 'bajo' | 'medio' | 'alto' = 'bajo';
    if (trendFactor > 0.04 || windProj > 42) {
      risk_level = 'alto';
    } else if (trendFactor > 0.01 || isWeekend) {
      risk_level = 'medio';
    }

    // Determine recommendations
    const recommendations: string[] = [];
    if (isWeekend) {
      recommendations.push("Fin de semana: Desactivar calefactores de soporte en oficinas y aserraderos.");
    } else {
      recommendations.push("Optimizar horarios de sierras en Tolhuin para aprovechar las horas de luz máxima.");
    }

    if (tempProj > 8.0) {
      recommendations.push(`Calentamiento estacional a ${tempProj}°C: Apagar sistemas de calefacción auxiliar de comercios.`);
    }

    if (windProj > 40) {
      recommendations.push(`Ráfagas proyectadas de ${windProj} km/h: Revisar hermeticidad de aberturas para evitar pérdidas de calor.`);
    }

    recommendations.push(`Aprovechar horas de luz diurna (${lightProj} hs) para reprogramar encendido de reflectores externos.`);

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
      lowerBound: parseFloat((base * 0.95).toFixed(1)),
      upperBound: parseFloat((base * 1.05).toFixed(1))
    });
  });

  return chartData;
}
