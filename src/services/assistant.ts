import { EnergyRecord, Anomaly, ChatMessage } from '../types/energy';

export function getAssistantResponse(
  records: EnergyRecord[],
  anomalies: Anomaly[],
  userMessage: string
): ChatMessage {
  const msg = userMessage.toLowerCase();
  
  // Helper to format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
  };

  // Helper to format kWh
  const formatKwh = (val: number) => {
    return `${val.toLocaleString('es-AR', { maximumFractionDigits: 1 })} kWh`;
  };

  const messageId = `msg_ast_${Date.now()}`;
  let responseText = "";
  let dataSummary: ChatMessage['dataSummary'] = undefined;

  if (records.length === 0) {
    return {
      id: messageId,
      sender: 'assistant',
      text: "No hay registros energéticos cargados actualmente. Por favor, cargá datos en la sección 'Carga de datos' para que pueda analizarlos.",
      timestamp: new Date()
    };
  }

  // 1. WHAT EQUIPMENT CONSUMES THE MOST?
  if (msg.includes('equipo') && (msg.includes('más') || msg.includes('mayor') || msg.includes('maximo') || msg.includes('máximo')) && msg.includes('consum')) {
    const equipConsumption: Record<string, { kwh: number; sector: string }> = {};
    records.forEach(r => {
      if (!equipConsumption[r.equipment]) {
        equipConsumption[r.equipment] = { kwh: 0, sector: r.sector };
      }
      equipConsumption[r.equipment].kwh += r.consumption_kwh;
    });

    const sorted = Object.entries(equipConsumption).sort((a, b) => b[1].kwh - a[1].kwh);
    const top = sorted[0];

    responseText = `El equipo que más energía consumió en el período analizado es **${top[0]}** (Sector: *${top[1].sector}*), acumulando un total de **${formatKwh(top[1].kwh)}**, lo que representa un costo estimado de **${formatCurrency(top[1].kwh * records[0].cost_per_kwh)}**.\n\nAquí tenés el Top 3 de equipos con mayor consumo:`;

    const chartData = sorted.slice(0, 5).map(([name, val]) => ({
      name,
      Consumo: parseFloat(val.kwh.toFixed(1))
    }));

    dataSummary = {
      type: 'chart',
      title: 'Consumo por Equipos (kWh)',
      content: sorted.slice(0, 3).map(([name, val], idx) => `${idx + 1}. ${name}: ${formatKwh(val.kwh)}`).join('\n'),
      chartData
    };
  }

  // 2. HIGHEST CONSUMPTION DAY
  else if (msg.includes('día') && (msg.includes('más') || msg.includes('mayor') || msg.includes('pico') || msg.includes('máximo')) && msg.includes('consum')) {
    const dailyConsumption: Record<string, number> = {};
    records.forEach(r => {
      dailyConsumption[r.date] = (dailyConsumption[r.date] || 0) + r.consumption_kwh;
    });

    const sorted = Object.entries(dailyConsumption).sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    
    // Parse date for cleaner display
    const dateObj = new Date(`${top[0]}T00:00:00`);
    const formattedDate = dateObj.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    responseText = `El día de mayor consumo energético general fue el **${formattedDate}** (${top[0]}), con un registro diario total de **${formatKwh(top[1])}** y un costo de **${formatCurrency(top[1] * records[0].cost_per_kwh)}**.\n\nEste pico suele asociarse con alta actividad productiva combinada con temperaturas extremas o ineficiencias puntuales detectadas ese día.`;

    dataSummary = {
      type: 'metric',
      title: 'Pico de Consumo Diario',
      content: `Fecha: ${top[0]}\nConsumo: ${formatKwh(top[1])}\nCosto: ${formatCurrency(top[1] * records[0].cost_per_kwh)}`
    };
  }

  // 3. SECTOR WITH MOST ANOMALIES
  else if (msg.includes('sector') && (msg.includes('más') || msg.includes('mayor')) && msg.includes('anomal')) {
    if (anomalies.length === 0) {
      responseText = "¡Buenas noticias! No se han detectado anomalías operativas en ningún sector con los datos actuales.";
    } else {
      const sectorAnoms: Record<string, number> = {};
      anomalies.forEach(a => {
        sectorAnoms[a.sector] = (sectorAnoms[a.sector] || 0) + 1;
      });

      const sorted = Object.entries(sectorAnoms).sort((a, b) => b[1] - a[1]);
      const top = sorted[0];

      responseText = `El sector con mayor cantidad de anomalías detectadas es **${top[0]}**, con un total de **${top[1]} alertas**. La mayoría están asociadas a desvíos de consumo y equipos encendidos fuera de turno.\n\nTe recomiendo revisar la pestaña de **Anomalías** para ver el listado detallado y resolverlas.`;

      dataSummary = {
        type: 'list',
        title: 'Anomalías por Sector',
        content: sorted.map(([sect, cnt]) => `- ${sect}: ${cnt} ${cnt === 1 ? 'alerta' : 'alertas'}`).join('\n')
      };
    }
  }

  // 4. SAVINGS PERCENTAGE ESTIMATION (e.g. "cuánto puedo ahorrar")
  else if (msg.includes('ahorr') || msg.includes('ahorro') || msg.includes('reducir')) {
    // Try to extract a percentage number from the text
    const percentMatch = msg.match(/(\d+)\s*%/);
    const percent = percentMatch ? parseInt(percentMatch[1], 10) : 10; // Default to 10%
    
    const totalKwh = records.reduce((sum, r) => sum + r.consumption_kwh, 0);
    const totalCost = totalKwh * records[0].cost_per_kwh;
    const savedKwh = totalKwh * (percent / 100);
    const savedCost = totalCost * (percent / 100);

    responseText = `Reduciendo un **${percent}%** el consumo general, podés obtener un ahorro estimado de **${formatKwh(savedKwh)}** en tu período de facturación, lo que equivale a **${formatCurrency(savedCost)}** de reducción en costos.\n\nPara lograr esto, las medidas más rápidas de implementar son:\n1. Programar apagados automáticos de luces y computadoras en horas no operativas.\n2. Reparar las fugas detectadas en la pestaña de **Anomalías** (ej. Compresores).\n3. Calibrar los sistemas de refrigeración y calefacción.`;

    dataSummary = {
      type: 'metric',
      title: `Simulación de Ahorro (${percent}%)`,
      content: `Ahorro estimado: ${formatCurrency(savedCost)}\nEnergía evitada: ${formatKwh(savedKwh)}\nEquivalente CO2: ${(savedKwh * 0.4).toFixed(1)} kg evitado`
    };
  }

  // 5. WHICH EQUIPMENT TO REVIEW FIRST
  else if (msg.includes('revisar') || msg.includes('primero') || msg.includes('mantenimiento') || msg.includes('critico') || msg.includes('crítico')) {
    const activeAnoms = anomalies.filter(a => !a.resolved);
    
    if (activeAnoms.length === 0) {
      responseText = "No tenés alertas críticas o pendientes. Todos los equipos se encuentran operando dentro de los rangos normales de eficiencia.";
    } else {
      // Prioritize severity: critica > alta > media > baja
      const severityWeight = { critica: 4, alta: 3, media: 2, baja: 1 };
      const sortedAnoms = [...activeAnoms].sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
      const topPriority = sortedAnoms[0];

      responseText = `El equipo de mayor prioridad técnica para revisión es el **${topPriority.equipment}** en el sector **${topPriority.sector}** (Gravedad: **${topPriority.severity.toUpperCase()}**).\n\n**Motivo:** ${topPriority.explanation}\n\n**Acción recomendada:** ${topPriority.recommendation}`;

      dataSummary = {
        type: 'list',
        title: 'Equipos Críticos Pendientes',
        content: sortedAnoms.slice(0, 3).map(a => `[${a.severity.toUpperCase()}] ${a.equipment} - ${a.type}`).join('\n')
      };
    }
  }

  // 6. LEAST EFFICIENT SHIFT (menos eficiente)
  else if (msg.includes('turno') && (msg.includes('menos') || msg.includes('peor') || msg.includes('eficiente') || msg.includes('eficiencia'))) {
    const shiftData: Record<string, { kwh: number; units: number }> = {
      'Mañana': { kwh: 0, units: 0 },
      'Tarde': { kwh: 0, units: 0 },
      'Noche': { kwh: 0, units: 0 }
    };

    records.forEach(r => {
      if (shiftData[r.shift]) {
        shiftData[r.shift].kwh += r.consumption_kwh;
        shiftData[r.shift].units += r.production_units;
      }
    });

    const shiftEff = Object.entries(shiftData).map(([name, data]) => {
      const kwhPerUnit = data.units > 0 ? (data.kwh / data.units) : 0;
      return { name, kwhPerUnit, ...data };
    });

    // We filter shifts with actual production to compare efficiency
    const productionShifts = shiftEff.filter(s => s.units > 0);
    const worstShift = productionShifts.sort((a, b) => b.kwhPerUnit - a.kwhPerUnit)[0];
    const bestShift = productionShifts.sort((a, b) => a.kwhPerUnit - b.kwhPerUnit)[0];

    if (worstShift) {
      responseText = `El turno menos eficiente es el **Turno ${worstShift.name}**, registrando un consumo promedio de **${worstShift.kwhPerUnit.toFixed(3)} kWh por unidad producida** (comparado con el Turno ${bestShift.name} que rinde a **${bestShift.kwhPerUnit.toFixed(3)} kWh/unidad**).\n\nEsto suele indicar que durante el turno ${worstShift.name} la maquinaria trabaja con baja carga productiva o se mantienen encendidos auxiliares innecesarios.`;

      dataSummary = {
        type: 'chart',
        title: 'Eficiencia por Turnos (kWh/Unidad)',
        content: shiftEff.map(s => `- Turno ${s.name}: ${s.kwhPerUnit.toFixed(3)} kWh/u`).join('\n'),
        chartData: shiftEff.map(s => ({
          name: s.name,
          'kWh por Unidad': parseFloat(s.kwhPerUnit.toFixed(3))
        }))
      };
    } else {
      responseText = "No se registran datos suficientes de producción asociados a los turnos para evaluar la eficiencia relativa en kWh/unidad.";
    }
  }

  // 7. IS THERE OFF-HOURS CONSUMPTION? (consumo fuera de horario)
  else if (msg.includes('horario') || msg.includes('fuera de') || msg.includes('noche') || msg.includes('nocturno')) {
    const offHoursAnoms = anomalies.filter(a => a.type.toLowerCase().includes('horario') || a.type.toLowerCase().includes('no operativo'));
    
    if (offHoursAnoms.length > 0) {
      responseText = `Sí, se han detectado consumos fuera de horario operativo. Específicamente, en el sector **${offHoursAnoms[0].sector}** para el equipo **${offHoursAnoms[0].equipment}**.\n\n**Detalle:** ${offHoursAnoms[0].explanation}\n\nSe sugiere implementar contactores horarios o temporizadores en los tableros de iluminación y calefacción de oficinas para forzar el apagado a partir de las 20:00 hs los viernes.`;

      dataSummary = {
        type: 'list',
        title: 'Consumos Fuera de Horario',
        content: offHoursAnoms.slice(0, 3).map(a => `- ${a.timestamp}: ${a.equipment}`).join('\n')
      };
    } else {
      responseText = "No se detecta consumo significativo fuera de los horarios operativos en los sectores principales. El apagado al final del día parece correcto.";
    }
  }

  // 8. GENERAL SUGGESTIONS / RECOMMENDATIONS
  else if (msg.includes('recomend') || msg.includes('suger') || msg.includes('que hago') || msg.includes('consejo')) {
    responseText = "Recomendaciones clave basadas en el análisis energético:\n\n" +
      "1. **Revisión del Compresor A**: Presenta indicios de fugas por un aumento en su consumo de base habitual. Retorno de inversión de reparación estimado en menos de 2 meses.\n" +
      "2. **Aislamiento en Cámara de frío**: La correlación con la temperatura exterior es alta. Considerar cortinas térmicas rápidas y verificar sellado.\n" +
      "3. **Programación en Administración**: Se detectan descuidos de luces y calefacción encendidos los fines de semana.\n" +
      "4. **Revisión de Motores**: Programar engrase y balanceo del Motor Principal L1 debido a su pérdida de rendimiento progresiva.";

    dataSummary = {
      type: 'list',
      title: 'Plan de Acción Recomendado',
      content: "- Inspeccionar fugas de aire comprimido\n- Instalar burletes térmicos en cámara frigorífica\n- Configurar domótica de apagado en oficinas\n- Lubricación preventiva Motor L1"
    };
  }

  // 9. DEFAULT RESPONSE (FALLBACK)
  else {
    responseText = `Hola. Soy **EnergyAI Assistant**, tu analista energético virtual. Puedo ayudarte a extraer conclusiones rápidas sobre tus datos de consumo.\n\n**Preguntas que podés hacerme:**\n- ¿Qué equipo consume más?\n- ¿Cuál fue el día de mayor consumo?\n- ¿Qué sector tiene más anomalías?\n- ¿Cuánto puedo ahorrar si reduzco el consumo un 15%?\n- ¿Qué turno es el menos eficiente?\n- ¿Qué equipo debería revisar primero?\n- ¿Hay consumos fuera de horario?\n- ¿Cuáles son las recomendaciones clave de este mes?\n\n*Nota: La arquitectura está lista para integrarse con un modelo LLM avanzado (como Gemini) a través de API.*`;
  }

  return {
    id: messageId,
    sender: 'assistant',
    text: responseText,
    timestamp: new Date(),
    dataSummary
  };
}
