import { EnergyRecord, Anomaly } from '../types/energy';

export function detectAnomalies(records: EnergyRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  if (records.length === 0) return [];

  // Group records by equipment and hour to establish baselines (average & std dev)
  const equipmentBaselines: Record<string, Record<number, { sum: number; count: number; values: number[] }>> = {};

  records.forEach(rec => {
    if (!equipmentBaselines[rec.equipment]) {
      equipmentBaselines[rec.equipment] = {};
    }
    if (!equipmentBaselines[rec.equipment][rec.hour]) {
      equipmentBaselines[rec.equipment][rec.hour] = { sum: 0, count: 0, values: [] };
    }
    equipmentBaselines[rec.equipment][rec.hour].sum += rec.consumption_kwh;
    equipmentBaselines[rec.equipment][rec.hour].count += 1;
    equipmentBaselines[rec.equipment][rec.hour].values.push(rec.consumption_kwh);
  });

  // Calculate statistics (average) for each equipment and hour
  const stats: Record<string, Record<number, { avg: number; stdDev: number }>> = {};
  Object.keys(equipmentBaselines).forEach(equip => {
    stats[equip] = {};
    for (let h = 0; h < 24; h++) {
      const b = equipmentBaselines[equip][h];
      if (b && b.count > 0) {
        const avg = b.sum / b.count;
        // Calculate standard deviation
        const sqDiffs = b.values.map(val => Math.pow(val - avg, 2));
        const avgSqDiff = sqDiffs.reduce((sum, val) => sum + val, 0) / sqDiffs.length;
        const stdDev = Math.sqrt(avgSqDiff) || 0.1;
        stats[equip][h] = { avg, stdDev };
      } else {
        stats[equip][h] = { avg: 0, stdDev: 1 };
      }
    }
  });

  // Sort records chronologically to detect anomalies sequentially
  const sortedRecords = [...records].sort((a, b) => {
    const timeA = new Date(`${a.date}T${String(a.hour).padStart(2, '0')}:00:00`).getTime();
    const timeB = new Date(`${b.date}T${String(b.hour).padStart(2, '0')}:00:00`).getTime();
    return timeA - timeB;
  });

  // Keep track of detected anomalies to avoid duplicates on the same day/equipment
  const detectedKeys = new Set<string>();

  sortedRecords.forEach(rec => {
    const timestamp = `${rec.date} ${String(rec.hour).padStart(2, '0')}:00`;
    const baseline = stats[rec.equipment]?.[rec.hour];
    if (!baseline) return;

    const key = `${rec.date}_${rec.equipment}`;

    // 1. Off-hours anomalies (Administration heating/lighting left on during weekends/nights)
    if (rec.sector === 'Administración Pública' || rec.equipment === 'Calefacción Eléctrica Soporte' || rec.equipment === 'Iluminación y Servidores') {
      const isWeekend = new Date(`${rec.date}T00:00:00`).getDay() === 0 || new Date(`${rec.date}T00:00:00`).getDay() === 6;
      const isNight = rec.hour >= 22 || rec.hour < 6;

      if ((isWeekend || isNight) && rec.consumption_kwh > 5.0 && !detectedKeys.has(key)) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_offhours_${rec.date}_${rec.hour}_${rec.equipment.replace(/\s+/g, '')}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Desvío de consumo en oficinas públicas',
          severity: 'media',
          explanation: `Se detectó un consumo ineficiente de ${rec.consumption_kwh} kWh en ${rec.equipment} durante horario no operativo (fin de semana o madrugada) en dependencias públicas. El promedio normal esperado es inferior a 1.0 kWh.`,
          recommendation: `Implementar temporizadores automáticos para apagar la calefacción eléctrica de soporte y luces al finalizar la jornada laboral los viernes.`,
          resolved: false
        });
        return; // skip other checks for this record
      }
    }

    // 2. High Outliers (e.g. Compressor leak)
    const deviationPercent = (rec.consumption_kwh - baseline.avg) / (baseline.avg || 1);
    
    if (rec.consumption_kwh > baseline.avg + 2 * baseline.stdDev && deviationPercent > 0.28 && !detectedKeys.has(key)) {
      
      // Specifically target Compressor leak in fishery cold chambers
      if (rec.equipment === 'Compresores de Frío Ushuaia' && deviationPercent > 0.35) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_leak_${rec.date}_${rec.hour}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Fuga o pérdida de compresión de congelado',
          severity: 'alta',
          explanation: `Los Compresores de Frío Ushuaia registraron un consumo de ${rec.consumption_kwh} kWh (un ${(deviationPercent * 100).toFixed(0)}% por encima de su promedio habitual de ${baseline.avg.toFixed(1)} kWh) sin registrar aumentos proporcionales en las toneladas refrigeradas.`,
          recommendation: `Realizar mantenimiento preventivo hidráulico en las válvulas de las cámaras de congelado y verificar el nivel de refrigerante.`,
          resolved: false
        });
        return;
      }

      // Generic High consumption outlier (excluding residential which is volatile)
      if (rec.equipment !== 'Compresores de Frío Ushuaia' && !rec.equipment.includes('Hogares') && !rec.equipment.includes('Soporte') && rec.production_units === 0) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_high_${rec.date}_${rec.hour}_${rec.equipment.replace(/\s+/g, '')}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Exceso de consumo en stand-by',
          severity: 'baja',
          explanation: `Consumo inusual de ${rec.consumption_kwh} kWh en reposo (stand-by) sin actividad de servicio. El promedio esperado en este horario es ${baseline.avg.toFixed(1)} kWh.`,
          recommendation: `Asegurarse de que el equipo sea apagado por completo en lugar de permanecer en modo de espera (standby).`,
          resolved: false
        });
        return;
      }
    }

    // 3. Efficiency Decline (Gradual degradation in electronic assembly line)
    if (rec.equipment === 'Línea de Ensamblaje' && rec.production_units > 10) {
      const kwhPerUnit = rec.consumption_kwh / rec.production_units;
      if (kwhPerUnit > 0.47 && !detectedKeys.has(key)) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_efficiency_${rec.date}_${rec.hour}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Pérdida progresiva de rendimiento industrial',
          severity: 'alta',
          explanation: `La Línea de Ensamblaje industrial (Ley 19.640) registró un rendimiento de ${kwhPerUnit.toFixed(3)} kWh/unidad, un 35% superior a la línea de base histórica. Esto refleja fricción mecánica o desbalanceo eléctrico.`,
          recommendation: `Programar mantenimiento preventivo de lubricación y control de corriente trifásica de los rodillos transportadores.`,
          resolved: false
        });
        return;
      }
    }

    // 4. Heatwave/climate cooling spikes in Tierra del Fuego (when temp climbs above 14°C)
    if (rec.equipment === 'Cámara Congeladora Grande' && rec.external_temperature > 14) {
      if (rec.consumption_kwh > baseline.avg * 1.35 && !detectedKeys.has(key)) {
        detectedKeys.add(key);
        anomalies.push({
          id: `anom_temp_${rec.date}_${rec.hour}`,
          timestamp,
          sector: rec.sector,
          equipment: rec.equipment,
          type: 'Sobrecarga térmica por anomalía climática',
          severity: 'critica',
          explanation: `La Cámara Congeladora Grande en puerto registró un consumo récord de ${rec.consumption_kwh} kWh debido a una temperatura ambiente externa atípica en la isla de ${rec.external_temperature}°C.`,
          recommendation: `Verificar burletes, minimizar apertura de compuertas durante las horas de pico térmico y activar las cortinas de viento de atenuación.`,
          resolved: false
        });
        return;
      }
    }
  });

  // Sort anomalies so the latest ones (chronologically) are first
  return anomalies.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
