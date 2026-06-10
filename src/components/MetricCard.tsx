import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend?: {
    value: string | number;
    isGood: boolean; // isGood means positive for saving, negative for cost/consumption
  };
  description?: string;
  accentColor?: 'cyan' | 'emerald' | 'violet' | 'amber' | 'rose';
}

export default function MetricCard({
  title,
  value,
  icon: IconComponent,
  trend,
  description,
  accentColor = 'cyan'
}: MetricCardProps) {
  const colorMap = {
    cyan: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-950/40',
      border: 'border-cyan-500/20',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.05)] hover:border-cyan-500/40',
      iconBorder: 'border-cyan-800/40'
    },
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/20',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.05)] hover:border-emerald-500/40',
      iconBorder: 'border-emerald-800/40'
    },
    violet: {
      text: 'text-violet-400',
      bg: 'bg-violet-950/40',
      border: 'border-violet-500/20',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.05)] hover:border-violet-500/40',
      iconBorder: 'border-violet-800/40'
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-950/40',
      border: 'border-amber-500/20',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.05)] hover:border-amber-500/40',
      iconBorder: 'border-amber-800/40'
    },
    rose: {
      text: 'text-rose-400',
      bg: 'bg-rose-950/40',
      border: 'border-rose-500/20',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.05)] hover:border-rose-500/40',
      iconBorder: 'border-rose-800/40'
    }
  };

  const currentStyles = colorMap[accentColor];

  return (
    <div className={`glass-card p-6 rounded-2xl flex flex-col justify-between border ${currentStyles.border} ${currentStyles.bg} ${currentStyles.glow}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
            {title}
          </span>
          <h3 className="text-2xl font-bold font-mono tracking-tight text-white mt-1">
            {value}
          </h3>
        </div>
        
        <div className={`p-2.5 rounded-xl border ${currentStyles.iconBorder} ${currentStyles.text} bg-slate-900/50`}>
          <IconComponent className="h-5 w-5" />
        </div>
      </div>

      {(trend || description) && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-900 text-xs">
          {trend ? (
            <div className="flex items-center gap-1 font-mono">
              <span className={`flex items-center gap-0.5 font-bold ${
                trend.isGood ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {trend.isGood ? (
                  <ArrowDownRight className="h-3 w-3 stroke-[2.5]" />
                ) : (
                  <ArrowUpRight className="h-3 w-3 stroke-[2.5]" />
                )}
                {trend.value}
              </span>
              <span className="text-slate-500">vs hist.</span>
            </div>
          ) : (
            <div />
          )}

          {description && (
            <span className="text-slate-400 text-right truncate pl-2 font-medium">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
