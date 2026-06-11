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

  const baseTariff = records[0]?.cost_per_kwh || 65.0;
  const currentSubsidyPct = 70; // 70% standard subsidy
  const realCostPerKwh = baseTariff / (1 - (currentSubsidyPct / 100)); // ~216 AR$ per kWh

  // 1. SUB-QUERIES: SUBSIDIOS Y QUITA (subsidio, quita, reduccion, eliminacion)
  if (msg.includes('subsidio') || msg.includes('quita') || msg.includes('reducc') || msg.includes('elimin')) {
    const totalKwh = records.reduce((sum, r) => sum + r.consumption_kwh, 0);
    const uniqueDates = Array.from(new Set(records.map(r => r.date)));
    const monthsCount = Math.max(1, uniqueDates.length / 30);
    const monthlyKwh = totalKwh / monthsCount;
    const baseBill = monthlyKwh * baseTariff;

    const cuts = [
      { pct: 25, newTariff: realCostPerKwh * (1 - 0.70 * 0.75), bill: monthlyKwh * realCostPerKwh * (1 - 0.70 * 0.75) },
      { pct: 50, newTariff: realCostPerKwh * (1 - 0.70 * 0.50), bill: monthlyKwh * realCostPerKwh * (1 - 0.70 * 0.50) },
      { pct: 75, newTariff: realCostPerKwh * (1 - 0.70 * 0.25), bill: monthlyKwh * realCostPerKwh * (1 - 0.70 * 0.25) },
      { pct: 100, newTariff: realCostPerKwh, bill: monthlyKwh * realCostPerKwh }
    ];

    responseText = `En Tierra del Fuego, las tarifas eléctricas cuentan actualmente con un subsidio estimado del **${currentSubsidyPct}%** debido a nuestra condición de **Sistema Eléctrico Aislado** (termoeléctrica a gas).\n\nAnte posibles reducciones del subsidio nacional, se proyectan los siguientes impactos financieros para su consumo promedio de **${formatKwh(monthlyKwh)}/mes**:\n\n` +
      `- **Quita del 25%:** Tarifa sube a **${formatCurrency(cuts[0].newTariff)}/kWh** (Factura mensual: **${formatCurrency(cuts[0].bill)}**, aumento de **23%**).\n` +
      `- **Quita del 50%:** Tarifa sube a **${formatCurrency(cuts[1].newTariff)}/kWh** (Factura mensual: **${formatCurrency(cuts[1].bill)}**, aumento de **63%**).\n` +
      `- **Quita del 75%:** Tarifa sube a **${formatCurrency(cuts[2].newTariff)}/kWh** (Factura mensual: **${formatCurrency(cuts[2].bill)}**, aumento de **125%**).\n` +
      `- **Quita del 100% (Eliminación):** Tarifa sube a **${formatCurrency(cuts[3].newTariff)}/kWh** (Factura mensual: **${formatCurrency(cuts[3].bill)}**, aumento de **233%**).\n\n` +
      `Para mitigar este riesgo financiero (nivel crítico con eliminación total), es indispensable implementar el plan de ahorro de energía (desplazamiento de pico y apagado inteligente).`;

    dataSummary = {
      type: 'metric',
      title: 'Prospectiva de Costo Tarifario (100% Quita)',
      content: `Consumo Base: ${formatKwh(monthlyKwh)}\nFactura Actual: ${formatCurrency(baseBill)}\nFactura sin Subsidio: ${formatCurrency(cuts[3].bill)}\nIncremento Neto: +${formatCurrency(cuts[3].bill - baseBill)}/mes`
    };
  }

  // 2. SUB-QUERIES: TARIFAS Y COSTO REAL (tarifa, precio, costo real, kwh, costo)
  else if (msg.includes('tarifa') || msg.includes('precio') || msg.includes('costo') || msg.includes('kwh') || msg.includes('valor')) {
    responseText = `Actualmente, la tarifa base subsidiada cargada en el sistema es de **${formatCurrency(baseTariff)} por kWh**.\n\nSin embargo, el **costo real de generación en Tierra del Fuego** (sin subsidios) es de aproximadamente **${formatCurrency(realCostPerKwh)} por kWh**, debido a que dependemos enteramente de la combustión local de gas natural por turbinas térmicas.\n\nCualquier reajuste tarifario nacional reducirá esta brecha, empujando los costos de operación locales. Podés simular diferentes escenarios interactivos en la pestaña **Simulador de Escenarios**.`;

    dataSummary = {
      type: 'list',
      title: 'Estructura de Costo (TDF)',
      content: `- Tarifa Subsidiada Activa: ${formatCurrency(baseTariff)}/kWh\n- Subsidio Estatal Estimado: ${currentSubsidyPct}%\n- Tarifa Real de Generación: ${formatCurrency(realCostPerKwh)}/kWh\n- Brecha Subsidiada: ${formatCurrency(realCostPerKwh - baseTariff)}/kWh`
    };
  }

  // 3. SUB-QUERIES: COSTOS FUTUROS E INTEGRACIÓN DE ESCENARIOS (proyeccion, futuro, escenarios, simulador)
  else if (msg.includes('futuro') || msg.includes('proyect') || msg.includes('escenario') || msg.includes('anticipar') || msg.includes('pronos') || msg.includes('predic')) {
    responseText = `Para anticipar los costos futuros y apoyar la toma de decisiones estratégicas, EnergIA SUR utiliza modelos predictivos basados en la curva de carga y tendencias climáticas de la isla.\n\nLa proyección de consumo para los próximos **7 días** estima una demanda estable con un riesgo operativo **bajo a medio**, condicionado por el encendido de calefactores eléctricos en oficinas y cámaras frigoríficas pesqueras.\n\nSi proyectamos una quita total de subsidios a mediano plazo, el gasto anual de la instalación aumentará en más de un **230%**. Podés exportar un informe ejecutivo completo desde el **Simulador de Escenarios** para presentarlo en gerencia.`;

    dataSummary = {
      type: 'list',
      title: 'Herramientas de Prospectiva',
      content: `- Predicciones a 7 días: Pestaña "Predicciones (7d)"\n- Simulador de Quita de Subsidios: Pestaña "Simulador de Escenarios"\n- Reporte Estratégico Ejecutivo: Descargable en formato Markdown`
    };
  }

  // 4. SUB-QUERIES: SOSTENIBILIDAD Y MEDIO AMBIENTE (huella, carbono, co2, arboles, sostenibilidad, ambiental, gas)
  else if (msg.includes('sostenib') || msg.includes('ambiental') || msg.includes('carbono') || msg.includes('co2') || msg.includes('arbol') || msg.includes('gas')) {
    const totalKwh = records.reduce((sum, r) => sum + r.consumption_kwh, 0);
    const co2Tons = (totalKwh * 0.37) / 1000;
    const treesNeeded = (totalKwh * 0.37) / 20;

    responseText = `Tierra del Fuego cuenta con una particularidad: **no está conectada al Sistema Interconectado Nacional (SADI)**. Esto significa que la electricidad se genera localmente en centrales térmicas a gas natural.\n\nEsto produce una huella de carbono de **0.37 kg CO2 por kWh**. Para su base de datos actual, esto equivale a:\n\n` +
      `- **Huella de Carbono Acumulada:** **${co2Tons.toFixed(2)} toneladas de CO2**.\n` +
      `- **Compensación de Reforestación:** Se requiere la absorción de **${Math.round(treesNeeded).toLocaleString('es-AR')} árboles** maduros durante un año.\n\n` +
      `Implementar un plan de eficiencia energética no solo reduce costos ante la quita de subsidios, sino que reduce la quema directa de combustibles fósiles en Ushuaia y Río Grande.`;

    dataSummary = {
      type: 'metric',
      title: 'Huella de Carbono y Mitigación',
      content: `Emisiones: ${co2Tons.toFixed(2)} ton CO2\nÁrboles requeridos: ${Math.round(treesNeeded).toLocaleString()}\nPotencial mitigación (15% ahorro): -${(co2Tons * 0.15).toFixed(2)} ton CO2`
    };
  }

  // 5. WHAT EQUIPMENT CONSUMES THE MOST?
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

    responseText = `El equipo que más energía consumió en el período analizado en Tierra del Fuego es la **${top[0]}** (Sector: *${top[1].sector}*), acumulando un total de **${formatKwh(top[1].kwh)}**, lo que representa un costo aproximado de **${formatCurrency(top[1].kwh * baseTariff)}** con tarifa subsidiada y **${formatCurrency(top[1].kwh * realCostPerKwh)}** en escenario de quita total.\n\nAquí tenés el Top de equipos con mayor consumo:`;

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

  // 6. HIGHEST CONSUMPTION DAY
  else if (msg.includes('día') && (msg.includes('más') || msg.includes('mayor') || msg.includes('pico') || msg.includes('máximo')) && msg.includes('consum')) {
    const dailyConsumption: Record<string, number> = {};
    records.forEach(r => {
      dailyConsumption[r.date] = (dailyConsumption[r.date] || 0) + r.consumption_kwh;
    });

    const sorted = Object.entries(dailyConsumption).sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    
    const dateObj = new Date(`${top[0]}T00:00:00`);
    const formattedDate = dateObj.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    responseText = `El día de mayor consumo energético general fue el **${formattedDate}** (${top[0]}), con un registro diario total de **${formatKwh(top[1])}** y un costo subsidiado de **${formatCurrency(top[1] * baseTariff)}**.\n\nEste pico de consumo coincide habitualmente con olas de frío extremo que demandan climatización comercial o sobrecarga térmica en las cámaras de congelado del puerto de Ushuaia.`;

    dataSummary = {
      type: 'metric',
      title: 'Pico de Consumo Diario',
      content: `Fecha: ${top[0]}\nConsumo: ${formatKwh(top[1])}\nCosto Subsidiado: ${formatCurrency(top[1] * baseTariff)}`
    };
  }

  // 7. SECTOR WITH MOST ANOMALIES / INEFFICIENCIES
  else if (msg.includes('sector') && (msg.includes('más') || msg.includes('mayor')) && (msg.includes('anomal') || msg.includes('inefici'))) {
    if (anomalies.length === 0) {
      responseText = "¡Buenas noticias! No se han detectado ineficiencias o anomalías operativas en ningún sector con los datos actuales.";
    } else {
      const sectorAnoms: Record<string, number> = {};
      anomalies.forEach(a => {
        sectorAnoms[a.sector] = (sectorAnoms[a.sector] || 0) + 1;
      });

      const sorted = Object.entries(sectorAnoms).sort((a, b) => b[1] - a[1]);
      const top = sorted[0];

      responseText = `El sector con mayor cantidad de ineficiencias detectadas es **${top[0]}**, con un total de **${top[1]} alertas**. La mayoría están asociadas a descuidos de calefacción eléctrica de soporte encendidos fuera de horario (fines de semana) y desvíos de rendimiento en motores industriales.\n\nTe recomiendo revisar la pestaña de **Ineficiencias** para ver el listado detallado y resolverlas.`;

      dataSummary = {
        type: 'list',
        title: 'Alertas por Sector',
        content: sorted.map(([sect, cnt]) => `- ${sect}: ${cnt} ${cnt === 1 ? 'alerta' : 'alertas'}`).join('\n')
      };
    }
  }

  // 8. SAVINGS PERCENTAGE ESTIMATION
  else if (msg.includes('ahorr') || msg.includes('ahorro') || msg.includes('reducir')) {
    const percentMatch = msg.match(/(\d+)\s*%/);
    const percent = percentMatch ? parseInt(percentMatch[1], 10) : 15; // Default 15%
    
    const totalKwh = records.reduce((sum, r) => sum + r.consumption_kwh, 0);
    const totalCost = totalKwh * baseTariff;
    const savedKwh = totalKwh * (percent / 100);
    const savedCost = totalCost * (percent / 100);

    responseText = `Reduciendo un **${percent}%** el consumo general, podés obtener un ahorro estimado de **${formatKwh(savedKwh)}** en tu facturación actual, lo que equivale a una reducción de costos de **${formatCurrency(savedCost)}**.\n\nPara lograr esto en Tierra del Fuego, las medidas recomendadas son:\n1. Reemplazar radiadores eléctricos auxiliares por climatización por agua caliente o gas.\n2. Desplazar los turnos industriales de alto consumo fuera de la banda horaria pico (18:00 a 22:00 hs).\n3. Programar apagados automáticos los fines de semana en la Administración Pública.`;

    dataSummary = {
      type: 'metric',
      title: `Simulación de Ahorro (${percent}%)`,
      content: `Ahorro estimado: ${formatCurrency(savedCost)}\nEnergía evitada: ${formatKwh(savedKwh)}\nEquivalente CO2: ${(savedKwh * 0.37).toFixed(1)} kg evitado`
    };
  }

  // 9. WHICH EQUIPMENT TO REVIEW FIRST
  else if (msg.includes('revisar') || msg.includes('primero') || msg.includes('mantenimiento') || msg.includes('critico') || msg.includes('crítico')) {
    const activeAnoms = anomalies.filter(a => !a.resolved);
    
    if (activeAnoms.length === 0) {
      responseText = "No tenés alertas críticas o ineficiencias pendientes. Todos los equipos se encuentran operando dentro de los rangos normales de eficiencia en la isla.";
    } else {
      const severityWeight = { critica: 4, alta: 3, media: 2, baja: 1 };
      const sortedAnoms = [...activeAnoms].sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
      const topPriority = sortedAnoms[0];

      responseText = `El equipo de mayor prioridad técnica para revisión es **${topPriority.equipment}** en el sector **${topPriority.sector}** (Gravedad: **${topPriority.severity.toUpperCase()}**).\n\n**Motivo:** ${topPriority.explanation}\n\n**Acción recomendada:** ${topPriority.recommendation}`;

      dataSummary = {
        type: 'list',
        title: 'Ineficiencias Críticas Pendientes',
        content: sortedAnoms.slice(0, 3).map(a => `[${a.severity.toUpperCase()}] ${a.equipment} - ${a.type}`).join('\n')
      };
    }
  }

  // 10. LEAST EFFICIENT SHIFT (menos eficiente)
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

    const productionShifts = shiftEff.filter(s => s.units > 0);
    const worstShift = productionShifts.sort((a, b) => b.kwhPerUnit - a.kwhPerUnit)[0];
    const bestShift = productionShifts.sort((a, b) => a.kwhPerUnit - b.kwhPerUnit)[0];

    if (worstShift) {
      responseText = `En el sector de Industria Electrónica, el turno menos eficiente es el **Turno ${worstShift.name}**, registrando un consumo promedio de **${worstShift.kwhPerUnit.toFixed(3)} kWh por unidad producida** (comparado con el Turno ${bestShift.name} que rinde a **${bestShift.kwhPerUnit.toFixed(3)} kWh/unidad**).\n\nEsto suele indicar que durante el turno ${worstShift.name} la maquinaria trabaja con baja carga productiva o se mantienen encendidos calefactores o compresores innecesarios.`;

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
      responseText = "No se registran datos suficientes de producción asociados a los turnos para evaluar la eficiencia relativa en kWh/unidad en las industrias de la provincia.";
    }
  }

  // 11. GENERAL SUGGESTIONS / RECOMMENDATIONS
  else if (msg.includes('recomend') || msg.includes('suger') || msg.includes('que hago') || msg.includes('consejo')) {
    responseText = "Recomendaciones de eficiencia clave basadas en la prospectiva energética de Tierra del Fuego:\n\n" +
      "1. **Revisión de Cámaras de Frío**: Presentan indicios de fugas por un aumento en su consumo de base habitual. Retorno de inversión de reparación estimado en menos de 2 meses.\n" +
      "2. **Aislamiento Térmico**: La correlación con la temperatura exterior de la isla es muy fuerte. Considerar cortinas térmicas y verificar burletes.\n" +
      "3. **Desplazamiento de Pico**: Desviar consumos del turno tarde de la franja pico de 18:00 a 22:00 hs para evitar penalidades de la Cooperativa Eléctrica de Río Grande.\n" +
      "4. **Control en Administración Pública**: Se detecta calefacción eléctrica secundaria encendida los fines de semana. Implementar contactores horarios.";

    dataSummary = {
      type: 'list',
      title: 'Plan de Acción Recomendado',
      content: "- Inspeccionar fugas en compresores de congelado\n- Instalar burletes térmicos en cámaras pesqueras\n- Desplazar turnos fuera del horario pico de TDF (18-22h)\n- Apagado inteligente en oficinas públicas"
    };
  }

  // 12. DEFAULT RESPONSE (FALLBACK)
  else {
    responseText = `Hola. Soy el asistente de **EnergIA SUR**, tu analista energético virtual para Tierra del Fuego. Puedo ayudarte a extraer conclusiones sobre consumos, subsidios y sostenibilidad en la provincia.\n\n**Preguntas que podés hacerme:**\n- ¿Cómo impacta la quita de subsidios en mi factura?\n- ¿Cuánto vale la tarifa subsidiada vs. el costo real de generación en TDF?\n- ¿Cómo influye que la provincia sea un sistema eléctrico aislado?\n- ¿Cuál es la huella de carbono de mi consumo y cómo se calcula?\n- ¿Qué equipo consume más energía?\n- ¿Qué ineficiencias críticas de calefacción u oficinas debo revisar primero?\n- ¿Cuáles son las recomendaciones de ahorro energético recomendadas para la isla?\n\n*Nota: La arquitectura está lista para integrarse con un modelo LLM avanzado (como Gemini) a través de API.*`;
  }

  return {
    id: messageId,
    sender: 'assistant',
    text: responseText,
    timestamp: new Date(),
    dataSummary
  };
}
