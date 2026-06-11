import React, { useState, useRef, useEffect } from 'react';
import { EnergyRecord, Anomaly, ChatMessage } from '../types/energy';
import { getAssistantResponse } from '../services/assistant';
import { Send, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip
} from 'recharts';

interface AssistantProps {
  records: EnergyRecord[];
  anomalies: Anomaly[];
}

export default function Assistant({ records, anomalies }: AssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: '¡Hola! Soy el **Asistente EnergIA**, tu consultor energético. Analicé el conjunto de datos activo y estoy listo para responder tus dudas.\n\nPodés escribirme o seleccionar alguna de las preguntas rápidas aquí abajo.',
          timestamp: new Date()
        }
      ]);
    }
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (text: string) => {
    if (!text.trim()) return;

    // Add User Message
    const userMsg: ChatMessage = {
      // eslint-disable-next-line react-hooks/purity
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate thinking delay
    setTimeout(() => {
      const response = getAssistantResponse(records, anomalies, text);
      setMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 1200);
  };

  const suggestionChips = [
    '¿Cómo impactará el próximo invierno en mis costos?',
    '¿Cuál es el mes de mayor riesgo energético?',
    '¿Cuánto debería reducir mi consumo para mantener mis costos actuales?',
    '¿Qué sectores presentan mayor vulnerabilidad?',
    '¿Qué recomendaciones climáticas clave debo aplicar?'
  ];

  // Helper to format chat message bold texts (**text**) as HTML bold tags
  const renderMessageText = (text: string) => {
    // Replace **bold** with strong
    const boldRegex = /\*\*(.*?)\*\*/g;
    const formatted = text
      .replace(boldRegex, '<strong class="text-cyan-400 font-extrabold">$1</strong>')
      .replace(/\n/g, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: formatted }} className="text-slate-200" />;
  };

  return (
    <div className="space-y-8 h-[calc(100vh-8rem)] flex flex-col justify-between animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Asistente EnergIA</h2>
          <p className="text-slate-400 mt-1">
            Chatea con nuestro modelo experto para realizar consultas en lenguaje natural sobre tus consumos.
          </p>
        </div>
        
        <span className="text-xs bg-slate-900 border border-slate-800 text-slate-500 px-3 py-1.5 rounded-xl font-mono flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse-soft"></span>
          Heurística Local / API Ready
        </span>
      </div>

      {/* Chat Area Panel */}
      <div className="flex-1 glass-panel rounded-2xl border border-slate-800 flex flex-col overflow-hidden min-h-0 bg-slate-950/20">
        
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            
            return (
              <div 
                key={msg.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-xl rounded-2xl p-4 space-y-3 shadow-md ${
                    isUser
                      ? 'bg-slate-900 border border-slate-800 text-white rounded-br-none'
                      : 'bg-slate-900/60 border border-slate-850/80 rounded-bl-none'
                  }`}
                >
                  {/* Sender title */}
                  <div className="flex justify-between items-center gap-6 text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      {!isUser && <Sparkles className="h-3 w-3 text-cyan-400 fill-cyan-400" />}
                      {isUser ? 'Usuario' : 'Agente EnergIA'}
                    </span>
                    <span>{msg.timestamp.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>

                  {/* Body text */}
                  <div className="text-sm leading-relaxed font-medium">
                    {renderMessageText(msg.text)}
                  </div>

                  {/* Render Data Summary if exists (charts, lists) */}
                  {msg.dataSummary && (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-900 text-xs mt-3 space-y-3">
                      <span className="text-[10px] text-slate-500 font-mono uppercase block border-b border-slate-900 pb-1.5">
                        {msg.dataSummary.title}
                      </span>
                      
                      {msg.dataSummary.type === 'chart' && msg.dataSummary.chartData && (
                        <div className="h-32 w-full pt-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={msg.dataSummary.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                              <XAxis dataKey="name" stroke="#475569" style={{ fontSize: 8, fontFamily: 'monospace' }} tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }} />
                              <Bar dataKey="Consumo" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                              {msg.dataSummary.chartData[0]['kWh por Unidad'] !== undefined && (
                                <Bar dataKey="kWh por Unidad" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {msg.dataSummary.type === 'list' && (
                        <pre className="font-mono text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                          {msg.dataSummary.content}
                        </pre>
                      )}

                      {msg.dataSummary.type === 'metric' && (
                        <div className="font-mono text-cyan-400 text-xs leading-relaxed whitespace-pre-wrap">
                          {msg.dataSummary.content}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-900/40 border border-slate-900 rounded-2xl rounded-bl-none p-4 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Suggestion Chips Box */}
        <div className="px-6 py-3 border-t border-slate-900 bg-slate-950/40 flex flex-wrap gap-2 shrink-0 overflow-x-auto">
          {suggestionChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              className="px-3 py-1.5 rounded-full text-xxs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Form Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputValue);
          }}
          className="p-4 border-t border-slate-900 bg-slate-950 flex gap-3 items-center shrink-0"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Preguntame sobre desvíos, consumos de turnos, o medidas de ahorro..."
            className="flex-1 p-3 rounded-xl border border-slate-800 bg-slate-900/50 text-slate-100 text-sm focus:border-cyan-500 focus:outline-none transition-all placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="p-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 disabled:opacity-40 disabled:hover:bg-cyan-600 transition-all font-bold cursor-pointer"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
