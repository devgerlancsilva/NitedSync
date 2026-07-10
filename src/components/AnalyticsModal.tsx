/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, BarChart3, PieChart as PieChartIcon, Users, Target, CheckCircle2, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose, activities }) => {
  // Data for Status Distribution
  const statusData = [
    { name: 'Backlog', value: activities.filter(a => a.status === 'backlog').length, color: '#fb7185' },
    { name: 'Execução', value: activities.filter(a => a.status === 'em_execucao').length, color: '#fbbf24' },
    { name: 'Revisão', value: activities.filter(a => a.status === 'em_revisao').length, color: '#818cf8' },
    { name: 'Concluído', value: activities.filter(a => a.status === 'finalizado').length, color: '#34d399' },
  ].filter(d => d.value > 0);

  const formatName = (name: string | null) => {
    if (!name) return 'Desconhecido';
    if (name.includes('@')) {
      const prefix = name.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return name.split(' ')[0];
  };

  const collaboratorCounts: Record<string, number> = {};
  activities.forEach(a => {
    if (a.assignees && a.assignees.length > 0) {
      a.assignees.forEach(assignee => {
        const formatted = formatName(assignee.name);
        collaboratorCounts[formatted] = (collaboratorCounts[formatted] || 0) + 1;
      });
    } else if (a.assigneeName) {
      const formatted = formatName(a.assigneeName);
      collaboratorCounts[formatted] = (collaboratorCounts[formatted] || 0) + 1;
    }
  });

  const collaboratorData = Object.entries(collaboratorCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const totalFinished = activities.filter(a => a.status === 'finalizado').length;
  const completionRate = activities.length > 0 ? Math.round((totalFinished / activities.length) * 100) : 0;
  const delayedTasks = activities.filter(a => a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'finalizado').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            className="relative w-full max-w-5xl bg-surface-panel rounded-[40px] shadow-2xl overflow-hidden border border-white/5 max-h-[90vh] flex flex-col"
          >
            <div className="flex justify-between items-center p-10 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-600/20 rounded-[24px] flex items-center justify-center border border-indigo-500/20 shadow-glow">
                  <BarChart3 className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">Fluxo & Produtividade</h2>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Análise estratégica de atividades</p>
                </div>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-90 group">
                <X className="w-8 h-8 text-slate-600 group-hover:text-white transition-colors" />
              </button>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12">
              {/* Top Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 rounded-[32px] shadow-lg shadow-indigo-900/20 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                    <Target className="w-32 h-32" />
                  </div>
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Atividades Totais</p>
                  <p className="text-5xl font-black text-white tracking-tighter">{activities.length}</p>
                </div>
                
                <div className="bg-surface-card border border-white/5 p-8 rounded-[32px] relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                    <CheckCircle2 className="w-32 h-32 text-emerald-400" />
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Taxa de Conclusão</p>
                  <p className="text-5xl font-black text-emerald-400 tracking-tighter">{completionRate}%</p>
                </div>

                <div className="bg-surface-card border border-white/5 p-8 rounded-[32px] relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700 text-amber-400">
                    <Zap className="w-32 h-32" />
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Em Execução</p>
                  <p className="text-5xl font-black text-amber-400 tracking-tighter">
                    {activities.filter(a => a.status === 'em_execucao').length}
                  </p>
                </div>

                <div className="bg-surface-card border border-white/5 p-8 rounded-[32px] relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700 text-rose-400">
                    <AlertCircle className="w-32 h-32" />
                  </div>
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Atrasadas</p>
                  <p className="text-5xl font-black text-rose-400 tracking-tighter">
                    {delayedTasks}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Status Distribution */}
                <div className="bg-surface-card rounded-[32px] border border-white/5 p-8 shadow-xl">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                      <PieChartIcon className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Distribuição por Status</h3>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          innerRadius={70}
                          outerRadius={100}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#111318', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '16px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                            padding: '12px'
                          }}
                          itemStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {statusData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{item.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collaborator Volume */}
                <div className="bg-surface-card rounded-[32px] border border-white/5 p-8 shadow-xl">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Volume por Colaborador</h3>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={collaboratorData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#475569" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis 
                          stroke="#475569" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 12 }}
                          contentStyle={{ 
                            backgroundColor: '#111318', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            borderRadius: '16px',
                            padding: '12px'
                          }}
                          itemStyle={{ color: '#818cf8', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="#6366f1" 
                          radius={[12, 12, 4, 4]} 
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {collaboratorData.length === 0 && (
                    <div className="h-full flex items-center justify-center -mt-8">
                      <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.3em]">Sem atribuições</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-10 bg-white/[0.01] border-t border-white/5 text-center">
               <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em]">FlowSync Insights • Sincronizado agora</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
