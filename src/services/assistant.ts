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
    responseText = `El próximo invierno tendrá un impacto crítico en tus costos si se combinan variables climáticas y de quita de subsidios:\n\n` +
      `- **Escenario A (Subsidio actual + invierno promedio):** Tus costos mensuales estimados serán de aproximadamente **${formatCurrency(records.reduce((sum, r) => sum + r.consumption_kwh, 0) / 4 * records[0].cost_per_kwh)}**.\n` +
      `- **Escenario B (Reducción del 50% + invierno severo):** El consumo aumentará un **25%** por la calefacción eléctrica de emergencia y la tarifa se duplicará, resultando en un aumento del **150%** en tu factura mensual.\n` +
      `- **Escenario C (Eliminación total + invierno extremo):** El consumo se disparará un **50%** por heladas extremas y la tarifa se cuadruplicará, resultando en un aumento del **500%** de costos (factura mensual multiplicada por 6).\n\n` +
      `**Recomendación IA:** Mejorar el aislamiento de aberturas de inmediato y priorizar sistemas de calefacción a gas natural en lugar de radiadores eléctricos de resistencia.`;
  }

  // 2. HIGHEST RISK ENERGY MONTH
  else if (msg.includes('mes') || msg.includes('riesgo') || msg.includes('crítico') || msg.includes('critico')) {
    responseText = `El mes de **Julio (Invierno)** presenta el mayor riesgo energético y de vulnerabilidad financiera en Tierra del Fuego. Las razones son:\n\n` +
      `1. **Temperatura mínima extrema**: Las olas de frío polar empujan las temperaturas bajo cero (promedio diario de -1°C, mínimas de -16°C), disparando el consumo de calefacción de soporte.\n` +
      `2. **Luz diurna reducida (7 horas)**: Provoca un incremento del **142%** en las horas de funcionamiento del alumbrado público y residencial comparado con el verano.\n` +
      `3. **Peligro de congelamiento**: Afecta directamente al sector forestal en Tolhuin (aserraderos cesan actividad por congelamiento de rollizos de madera) y exige desescarches de emergencia en cámaras pesqueras de Ushuaia.`;
  }

  // 3. HOW MUCH TO REDUCE CONSUMPTION TO MAINTAIN COSTS
  else if (msg.includes('reducir') || msg.includes('mantener') || msg.includes('ahorrar')) {
    responseText = `Para mantener estables tus costos de facturación actuales frente a las quitas de subsidio proyectadas:\n\n` +
      `- Ante una **reducción del 50% de subsidio (con invierno severo)**: Deberías reducir tu consumo en un **60%**, lo cual es inviable sin cambiar a artefactos a gas y apagar sistemas no operativos.\n` +
      `- Ante la **eliminación total del subsidio (con invierno extremo)**: Requerirías una reducción del **83%** de consumo energético. Esto demuestra que la eficiencia operativa no es suficiente y se necesita una reestructuración de la envolvente térmica (aislación de techos y ventanas DVH).`;
  }

  // 4. MOST VULNERABLE SECTORS
  else if (msg.includes('vulnerabilidad') || msg.includes('sectores') || msg.includes('sector')) {
    responseText = `Los sectores de mayor vulnerabilidad energética detectados en el sistema aislado fueguino son:\n\n` +
      `1. **Residencial Ushuaia y Río Grande**: Muy expuestos por la falta de redes de gas natural en asentamientos nuevos, forzando calefacción por radiadores eléctricos ineficientes.\n` +
      `2. **Turismo & Cabañas en Tolhuin**: Sufren una alta estacionalidad. En verano e invierno consumen mucha calefacción eléctrica por el flujo turístico, pero tienen baja resiliencia financiera.\n` +
      `3. **Aserraderos & Madera Tolhuin**: Altamente vulnerables a suspensiones operativas por tormentas de nieve y congelación de rollizos durante el invierno.`;
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
    responseText = "Recomendaciones clave de resiliencia productiva basadas en el análisis energético provincial:\n\n" +
      "1. **Mantenimiento en Cámaras de Congelado (Ushuaia)**: Programar desescarches periódicos en invierno para evitar pérdida por hermeticidad.\n" +
      "2. **Ajuste de Calefacción Hoteles/Comercios**: Apagar radiadores auxiliares en verano cuando la temperatura exterior supere los 8°C.\n" +
      "3. **Planificación de Operación de Aserraderos (Tolhuin)**: Desplazar tareas intensivas de corte a primavera/verano, minimizando pérdidas invernales.\n" +
      "4. **Aislación Estructural (Vientos Fuertes)**: Sellar aberturas para mitigar ráfagas promedio de 35 km/h que aumentan la disipación térmica.";

    dataSummary = {
      type: 'list',
      title: 'Plan de Acción Sugerido',
      content: "- Desescarche de evaporadores pesqueros\n- Automatización de termostatos de soporte\n- Cese programado en Tolhuin por nevadas\n- Sellado de filtraciones de aire por ráfagas"
    };
  }

  // 9. DEFAULT RESPONSE (FALLBACK)
  else {
    responseText = `Hola. Soy el **Asistente EnergIA**, tu consultor de resiliencia energética en Tierra del Fuego. Analicé el conjunto de datos estacional (120 días).\n\n**Preguntas clave sobre prospectiva climática que podés hacerme:**\n- ¿Cómo impactará el próximo invierno en mis costos?\n- ¿Cuál es el mes de mayor riesgo energético?\n- ¿Cuánto debería reducir mi consumo para mantener mis costos actuales?\n- ¿Qué sectores presentan mayor vulnerabilidad?\n- ¿Qué recomendaciones climáticas clave debo aplicar?\n\n*Nota: La arquitectura está lista para integrarse con modelos LLM avanzados (como Gemini) a través de API.*`;
  }

  return {
    id: messageId,
    sender: 'assistant',
    text: responseText,
    timestamp: new Date(),
    dataSummary
  };
}
