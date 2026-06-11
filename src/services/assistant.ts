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
  let responseText: string;
  let dataSummary: ChatMessage['dataSummary'] = undefined;

  if (records.length === 0) {
    return {
      id: messageId,
      sender: 'assistant',
      text: "No hay registros energéticos cargados actualmente. Por favor, cargá datos en la sección 'Carga de datos' para que pueda analizarlos.",
      timestamp: new Date()
    };
  }

  // 1. GENERAL WINTER IMPACTS & SUBSIDY ELIMINATION IN WINTER
  if (msg.includes('invierno') || msg.includes('frío') || msg.includes('frio') || msg.includes('estacional')) {
    responseText = `El próximo invierno tendrá un impacto crítico en los costos de la planta industrial si se combinan variables climáticas y la quita de subsidios:\n\n` +
      `- **Escenario A (Subsidio actual + invierno promedio):** El costo mensual estimado será de aproximadamente **${formatCurrency(records.reduce((sum, r) => sum + r.consumption_kwh, 0) / 4 * records[0].cost_per_kwh)}**.\n` +
      `- **Escenario B (Reducción del 50% + invierno severo):** El consumo aumentará un **25%** debido al uso extensivo de la calefacción de soporte en el depósito e iluminación en los turnos de mañana/tarde (solo 7 horas de sol). Con tarifa duplicada, resulta en un incremento del **150%** mensual.\n` +
      `- **Escenario C (Eliminación total + invierno extremo):** El consumo subirá un **50%** por el precalentamiento continuo de maquinaria y calefactores a resistencia para resguardar tuberías. Con tarifa cuadruplicada, el incremento de costos será del **500%** mensual.\n\n` +
      `**Recomendación IA:** Programar el precalentamiento de motores de las líneas de producción de forma secuencial y sellar las aberturas del depósito de inmediato.`;
  }

  // 2. HIGHEST RISK ENERGY MONTH
  else if (msg.includes('mes') || msg.includes('riesgo') || msg.includes('crítico') || msg.includes('critico')) {
    responseText = `El mes de **Julio (Invierno)** presenta el mayor riesgo energético y de vulnerabilidad financiera para la planta industrial en Tierra del Fuego. Las razones son:\n\n` +
      `1. **Temperatura mínima extrema**: Las olas de frío polar empujan las temperaturas bajo cero (mínimas históricas de -16°C), disparando el consumo en la calefacción de oficinas y del sistema de calefacción general.\n` +
      `2. **Luz diurna reducida (7 horas)**: Provoca un incremento del **142%** en las horas de funcionamiento de la iluminación de la planta e iluminación de oficinas en comparación con el verano.\n` +
      `3. **Peligro de congelamiento**: Exige desescarches continuos de emergencia en la Cámara Frigorífica de Ushuaia y aumenta las ineficiencias de arranque de los motores principales de producción en Río Grande.`;
  }

  // 3. HOW MUCH TO REDUCE CONSUMPTION TO MAINTAIN COSTS
  else if (msg.includes('reducir') || msg.includes('mantener') || msg.includes('ahorrar')) {
    responseText = `Para mantener estables los costos de facturación de la planta industrial frente a las quitas de subsidio proyectadas:\n\n` +
      `- Ante una **reducción del 50% de subsidio (con invierno severo)**: Se debería reducir el consumo en un **60%**, lo cual es inviable sin suspender turnos productivos nocturnos o automatizar por completo las consignas térmicas de calefacción.\n` +
      `- Ante la **eliminación total del subsidio (con invierno extremo)**: Requerirías una reducción del **83%** de consumo energético. Esto demuestra que la eficiencia simple no es suficiente; se necesita inversión en precalentamiento a gas y aislación térmica estructural en depósitos de Tolhuin.`;
  }

  // 4. MOST VULNERABLE SECTORS
  else if (msg.includes('vulnerabilidad') || msg.includes('sectores') || msg.includes('sector')) {
    responseText = `Los sectores industriales de mayor vulnerabilidad energética detectados en las operaciones son:\n\n` +
      `1. **Calefacción y Oficinas (Ushuaia)**: Altamente vulnerables debido a las olas de frío extremo que quintuplican la demanda eléctrica de termostatos de soporte mal calibrados.\n` +
      `2. **Cámara de frío (Ushuaia)**: Sujeta a alto consumo reactivo y acumulación acelerada de hielo (escarcha) en evaporadores durante las tormentas de nieve.\n` +
      `3. **Líneas de Producción y Compresores (Río Grande)**: Afectadas por pérdidas de eficiencia en arranques en frío de los motores principales y fugas neumáticas durante temporales de viento severo.`;
  }

  // 5. EQUIPOS QUE MÁS CONSUMEN
  else if (msg.includes('equipo') && (msg.includes('más') || msg.includes('mayor') || msg.includes('maximo') || msg.includes('máximo')) && msg.includes('consum')) {
    const equipConsumption: Record<string, { kwh: number; sector: string }> = {};
    records.forEach(r => {
      if (!equipConsumption[r.equipment]) {
        equipConsumption[r.equipment] = { kwh: 0, sector: r.sector };
      }
      equipConsumption[r.equipment].kwh += r.consumption_kwh;
    });

    const sorted = Object.entries(equipConsumption).sort((a, b) => b[1].kwh - a[1].kwh);
    const top = sorted[0];

    responseText = `El equipo que más energía consumió en el ciclo analizado es **${top[0]}** (Sector: *${top[1].sector}*), acumulando un total de **${formatKwh(top[1].kwh)}**, lo que representa un costo estimado de **${formatCurrency(top[1].kwh * records[0].cost_per_kwh)}**.\n\nAquí tenés el Top 3 de equipos con mayor consumo:`;

    const chartData = sorted.slice(0, 5).map(([name, val]) => ({
      name,
      Consumo: parseFloat(val.kwh.toFixed(1))
    }));

    dataSummary = {
      type: 'chart',
      title: 'Equipos de Mayor Demanda',
      content: sorted.slice(0, 3).map(([name, val]) => `- ${name}: ${formatKwh(val.kwh)}`).join('\n'),
      chartData
    };
  }

  // 6. GENERAL RECOMMENDATIONS fallback
  else if (msg.includes('recomend') || msg.includes('suger') || msg.includes('que hago') || msg.includes('consejo')) {
    responseText = "Recomendaciones clave de resiliencia productiva basadas en el análisis energético industrial:\n\n" +
      "1. **Mantenimiento en Cámara Frigorífica (Ushuaia)**: Programar desescarches periódicos en invierno para evitar pérdida por hermeticidad y escarcha.\n" +
      "2. **Ajuste de Calefacción Oficinas**: Programar el apagado automático de radiadores de soporte en verano e implementar umbrales de 17°C.\n" +
      "3. **Planificación de Arranques de Motores (Río Grande)**: Secuenciar el encendido de los motores principales L1 y L2 para reducir la potencia pico de arranque en mañanas frías.\n" +
      "4. **Control de Fugas en Compresores**: Auditar juntas de la línea de aire comprimido vulnerables a ráfagas de viento y temporales externos.";

    dataSummary = {
      type: 'list',
      title: 'Plan de Acción Sugerido',
      content: "- Desescarche de evaporadores en Ushuaia\n- Precalentamiento secuencial de motores L1 y L2\n- Calibración de termostatos de oficinas\n- Sellado de fugas en la línea de compresores"
    };
  }

  // 9. DEFAULT RESPONSE (FALLBACK)
  else {
    responseText = `Hola. Soy el **Asistente EnergIA**, tu consultor de resiliencia energética para la planta industrial en Tierra del Fuego. Analicé el conjunto de datos estacional (120 días).\n\n**Preguntas clave sobre prospectiva industrial que podés hacerme:**\n- ¿Cómo impactará el próximo invierno en los costos de planta?\n- ¿Cuál es el mes de mayor riesgo energético en la operación?\n- ¿Cuánto debería reducir el consumo para mantener costos?\n- ¿Qué sectores presentan mayor vulnerabilidad?\n- ¿Qué recomendaciones climáticas debo aplicar?\n\n*Nota: La arquitectura está lista para integrarse con modelos LLM avanzados (como Gemini) a través de API.*`;
  }

  return {
    id: messageId,
    sender: 'assistant',
    text: responseText,
    timestamp: new Date(),
    dataSummary
  };
}
