import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  TrendingUp,
  AlertTriangle,
  Calendar,
  BarChart3,
  Calculator,
  MessageSquareCode,
  FileText,
  Globe,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  anomalyCount: number;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, anomalyCount, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', name: 'Carga de Datos', icon: UploadCloud },
    { id: 'analysis', name: 'Análisis de Consumo', icon: TrendingUp },
    { id: 'anomalies', name: 'Anomalías', icon: AlertTriangle, badge: anomalyCount },
    { id: 'predictions', name: 'Predicciones (7d)', icon: Calendar },
    { id: 'comparator', name: 'Comparador de Eficiencia', icon: BarChart3 },
    { id: 'simulator', name: 'Simulador de Escenarios', icon: Calculator },
    { id: 'assistant', name: 'Asistente EnergIA', icon: MessageSquareCode },
    { id: 'report', name: 'Reporte Mensual', icon: FileText },
    { id: 'sources', name: 'Fuentes de Datos', icon: Globe },
  ];

  return (
    <aside className="w-80 h-screen sticky top-0 flex flex-col bg-slate-950 border-r border-slate-800 text-slate-300">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-900 bg-slate-950/50">
        <div className="h-20 w-20 flex items-center justify-center bg-transparent shrink-0">
          <img src="/logo.png" alt="EnergIA Sur Logo" className="h-full w-full object-contain hover:scale-105 transition-transform duration-300" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent tracking-wide">
            EnergIA Sur
          </h1>
          <p className="text-xs text-slate-500 font-mono">v1.0.0 • Industrial IoT</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5 scrollbar-thin">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/70 to-slate-900 text-cyan-400 border-l-4 border-cyan-500 shadow-md shadow-cyan-950/20'
                  : 'hover:bg-slate-900/60 hover:text-slate-100 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <IconComponent
                  className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`px-2 py-0.5 text-xxs font-bold rounded-full ${
                  isActive 
                    ? 'bg-cyan-500 text-slate-950' 
                    : 'bg-rose-950/60 text-rose-400 border border-rose-800/40 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/30 font-mono text-[10px] text-slate-500 space-y-2">
        <div className="flex justify-between items-center">
          <span>SISTEMA IoT</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-slate-400">ONLINE</span>
          </span>
        </div>
        <div className="flex justify-between">
          <span>ALGORITMO AI</span>
          <span className="text-cyan-400">ACTIVO</span>
        </div>
        <div className="text-[9px] text-slate-600 truncate">
          CWD: IATHON_LOCAL_NODE
        </div>
        
        {/* Cerrar Sesión Button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold text-rose-400 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-700/50 hover:text-rose-300 transition-all duration-200 mt-3 font-mono uppercase"
        >
          <LogOut className="h-3.5 w-3.5" /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
