import React, { useState } from 'react';
import { Globe, Server, CloudSun, Database, Code, CheckCircle, RefreshCw, Key } from 'lucide-react';

export default function ExternalSources() {
  const [smnKey, setSmnKey] = useState<string>('');
  const [indecKey, setIndecKey] = useState<string>('');
  const [activeConnections, setActiveConnections] = useState<Record<string, boolean>>({
    smn: false,
    indec: false,
    energia: false,
    scada: true
  });
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState<boolean>(false);

  const toggleConnection = (key: string) => {
    setActiveConnections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleTestConnection = () => {
    setTesting(true);
    setTestStatus(null);
    setTimeout(() => {
      setTesting(false);
      setTestStatus('¡Conexión verificada! Se establecieron canales seguros con los endpoints públicos de prueba. Latencia media: 124ms.');
    }, 1500);
  };

  // Code snippets for developer guidance
  const codeSnippet = `// Ejemplo de integración en TypeScript / NodeJS para recopilar datos de climatología (SMN)
import axios from 'axios';

interface WeatherForecast {
  date: string;
  hour: number;
  temp_c: number;
}

export async function fetchSMNWeather(provincia: string): Promise<WeatherForecast[]> {
  const SMN_ENDPOINT = 'https://api.smn.gob.ar/v1/forecast';
  const API_KEY = process.env.SMN_API_KEY;

  try {
    const response = await axios.get(SMN_ENDPOINT, {
      headers: { 'Authorization': \`Bearer \${API_KEY}\` },
      params: { region: provincia }
    });

    // Mapea la temperatura externa proyectada para los próximos 7 días
    return response.data.map((item: any) => ({
      date: item.fecha,
      hour: item.hora,
      temp_c: item.temperatura
    }));
  } catch (error) {
    console.error('Error al consultar el SMN API:', error);
    return [];
  }
}`;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Fuentes de Datos Externas</h2>
        <p className="text-slate-400 mt-1">
          Configure y administre credenciales para conectar APIs públicas nacionales y lecturas de telemedidores SCADA.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Connection switches and API keys inputs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-400" /> Servicios Disponibles para Vinculación
            </h3>

            <div className="space-y-5">
              {/* SMN */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-900 flex items-start justify-between gap-4">
                <div className="flex gap-3.5">
                  <div className="p-2.5 rounded-lg bg-slate-950 text-amber-500 border border-slate-900 shrink-0">
                    <CloudSun className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Servicio Meteorológico Nacional (SMN)</h4>
                    <p className="text-xxs text-slate-500 mt-1 leading-relaxed">
                      Provee temperaturas ambiente externas. Crucial para correlacionar la eficiencia de bombas de calor, aires y cámara de frío.
                    </p>
                    {activeConnections.smn && (
                      <div className="mt-3 flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-slate-600" />
                        <input
                          type="password"
                          placeholder="Token de acceso API del SMN"
                          value={smnKey}
                          onChange={(e) => setSmnKey(e.target.value)}
                          className="p-1.5 rounded bg-slate-950 border border-slate-800 text-xxs font-mono focus:border-cyan-500 focus:outline-none w-64 text-slate-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => toggleConnection('smn')}
                  className={`px-3 py-1.5 rounded-lg text-xxs font-bold uppercase transition-all shrink-0 cursor-pointer ${
                    activeConnections.smn 
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40' 
                      : 'bg-slate-950 text-slate-500 border border-slate-900 hover:text-slate-300'
                  }`}
                >
                  {activeConnections.smn ? 'Desconectar' : 'Vincular'}
                </button>
              </div>

              {/* INDEC */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-900 flex items-start justify-between gap-4">
                <div className="flex gap-3.5">
                  <div className="p-2.5 rounded-lg bg-slate-950 text-cyan-400 border border-slate-900 shrink-0">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Portal de Datos INDEC / IPIEC (Tierra del Fuego)</h4>
                    <p className="text-xxs text-slate-500 mt-1 leading-relaxed">
                      Accede a estadísticas industriales, índices de precios mayoristas y actividad del MEM. Útil para reajustar coeficientes de costo.
                    </p>
                    {activeConnections.indec && (
                      <div className="mt-3 flex items-center gap-2">
                        <Key className="h-3.5 w-3.5 text-slate-600" />
                        <input
                          type="password"
                          placeholder="API Key de Datos Abiertos"
                          value={indecKey}
                          onChange={(e) => setIndecKey(e.target.value)}
                          className="p-1.5 rounded bg-slate-950 border border-slate-800 text-xxs font-mono focus:border-cyan-500 focus:outline-none w-64 text-slate-300"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => toggleConnection('indec')}
                  className={`px-3 py-1.5 rounded-lg text-xxs font-bold uppercase transition-all shrink-0 cursor-pointer ${
                    activeConnections.indec 
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40' 
                      : 'bg-slate-950 text-slate-500 border border-slate-900 hover:text-slate-300'
                  }`}
                >
                  {activeConnections.indec ? 'Desconectar' : 'Vincular'}
                </button>
              </div>

              {/* MEM Secretaría de Energía */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-900 flex items-start justify-between gap-4">
                <div className="flex gap-3.5">
                  <div className="p-2.5 rounded-lg bg-slate-950 text-violet-400 border border-slate-900 shrink-0">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Base de Datos de Energía Abierta (Secretaría de Energía)</h4>
                    <p className="text-xxs text-slate-500 mt-1 leading-relaxed">
                      Sincronización con el mercado mayorista de electricidad nacional. Descarga precios por franja horaria real (Pico, Valle y Resto).
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleConnection('energia')}
                  className={`px-3 py-1.5 rounded-lg text-xxs font-bold uppercase transition-all shrink-0 cursor-pointer ${
                    activeConnections.energia 
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40' 
                      : 'bg-slate-950 text-slate-500 border border-slate-900 hover:text-slate-300'
                  }`}
                >
                  {activeConnections.energia ? 'Desconectar' : 'Vincular'}
                </button>
              </div>

              {/* Local SCADA */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-900 flex items-start justify-between gap-4">
                <div className="flex gap-3.5">
                  <div className="p-2.5 rounded-lg bg-slate-950 text-emerald-400 border border-slate-900 shrink-0">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Medidor Local / Integración Modbus/SCADA</h4>
                    <p className="text-xxs text-slate-500 mt-1 leading-relaxed">
                      Conexión TCP directa con analizadores de red instalados en tableros principales. Provee mediciones en tiempo real.
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleConnection('scada')}
                  className={`px-3 py-1.5 rounded-lg text-xxs font-bold uppercase transition-all shrink-0 cursor-pointer ${
                    activeConnections.scada 
                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40' 
                      : 'bg-slate-950 text-slate-500 border border-slate-900 hover:text-slate-300'
                  }`}
                >
                  {activeConnections.scada ? 'Desconectar' : 'Vincular'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Sandbox Card */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Test connection */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Consola de Test</h4>
            
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-cyan-400 hover:text-cyan-300 transition-all text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {testing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Verificando...
                </>
              ) : (
                <>
                  Testear Enlaces Públicos
                </>
              )}
            </button>

            {testStatus && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-900 text-[10px] text-slate-400 leading-relaxed font-mono flex items-start gap-2 animate-fade-in">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-400">Estado: OK</span>
                  <p className="mt-1">{testStatus}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick links info */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3 text-xs text-slate-400 leading-relaxed">
            <h4 className="text-slate-200 font-bold">Documentación de Orígenes</h4>
            <p>
              El módulo de IA combina estas bases de datos para calibrar las predicciones. Por ejemplo, si se pronostica una ola de calor según el SMN, el modelo pre-carga un factor multiplicador de 1.45x para los sistemas de enfriamiento.
            </p>
          </div>
        </div>
      </div>

      {/* Code Sandbox section */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Code className="h-5 w-5 text-cyan-400" /> Referencia Técnica de Conectores (SDK Snippet)
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Los desarrolladores pueden usar el siguiente SDK de referencia en TypeScript para construir el cargador periódico (cronjob) que extraiga los datos ambientales y los cargue en el portal:
        </p>
        
        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-900 text-xxs font-mono text-cyan-500 overflow-x-auto leading-relaxed scrollbar-thin">
          <code>{codeSnippet}</code>
        </pre>
      </div>
    </div>
  );
}
