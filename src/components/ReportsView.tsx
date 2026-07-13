/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { useAuth } from './FirebaseProvider';
import { Activity, ActivityStatus, ActivityPriority, DailyEntry } from '../types';
import { motion } from 'motion/react';
import { 
  Calendar, Download, Filter, ChevronLeft, ChevronRight,
  Clock, Link2, BarChart3, CheckCircle2, Play, ListTodo, Search,
  Loader2, FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ReportMode = 'activities' | 'daily';

const STATUS_LABELS: Record<ActivityStatus, string> = {
  backlog:     'Backlog',
  em_execucao: 'Em Execução',
  em_revisao:  'Em Revisão',
  finalizado:  'Finalizado',
};

const STATUS_COLORS: Record<ActivityStatus, string> = {
  backlog:     'text-rose-400 bg-rose-500/10 border-rose-500/20',
  em_execucao: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  em_revisao:  'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  finalizado:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

const PRIORITY_COLORS: Record<ActivityPriority, string> = {
  alta:  'text-rose-400 bg-rose-500/10',
  media: 'text-amber-400 bg-amber-500/10',
  baixa: 'text-slate-400 bg-slate-700/50',
};

export const ReportsView: React.FC = () => {
  const { user, profile } = useAuth();
  
  const [mode, setMode] = useState<ReportMode>('activities');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'todas'>('todas');
  const [priorityFilter, setPriorityFilter] = useState<ActivityPriority | 'todas'>('todas');

  // Data
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);

  const isAdmin = profile?.role === 'admin';
  const isSupervisor = profile?.role === 'supervisor';
  const isColaborador = profile?.role === 'colaborador';

  const fetchData = async () => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      // Fetch Activities
      let actQ = query(collection(db, 'activities'), orderBy('updatedAt', 'desc'));
      const actSnap = await getDocs(actQ);
      let acts = actSnap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));

      // Role filtering for activities
      if (isSupervisor) {
        acts = acts.filter(a => !a.groupId || a.groupId === profile.groupId);
      } else if (isColaborador) {
        acts = acts.filter(a => 
          a.assignees?.some(x => x.uid === user.uid) ||
          a.assigneeId === user.uid ||
          a.createdBy === user.uid ||
          a.collaborators?.some(c => c.uid === user.uid) ||
          (a.groupId && a.groupId === profile.groupId)
        );
      }

      // Apply status and priority filters
      if (statusFilter !== 'todas') acts = acts.filter(a => a.status === statusFilter);
      if (priorityFilter !== 'todas') acts = acts.filter(a => a.priority === priorityFilter);
      setActivities(acts);

      // Fetch Daily Entries
      let entries: DailyEntry[] = [];
      const from = dateFrom;
      const to = dateTo;

      let dQ;
      if (isAdmin) {
        dQ = query(
          collection(db, 'daily_entries'),
          where('date', '>=', from),
          where('date', '<=', to),
          orderBy('date', 'desc')
        );
      } else if (isSupervisor) {
        dQ = query(
          collection(db, 'daily_entries'),
          where('date', '>=', from),
          where('date', '<=', to),
          where('groupId', '==', profile.groupId),
          orderBy('date', 'desc')
        );
      } else {
        dQ = query(
          collection(db, 'daily_entries'),
          where('date', '>=', from),
          where('date', '<=', to),
          where('userId', '==', user.uid),
          orderBy('date', 'desc')
        );
      }

      const dSnap = await getDocs(dQ);
      entries = dSnap.docs.map(d => ({ id: d.id, ...(d.data() as object) } as DailyEntry));
      setDailyEntries(entries);

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, profile, statusFilter, priorityFilter, dateFrom, dateTo]);

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const element = reportRef.current;
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = '#0f172a'; // Ensure dark background is captured

      // Unhide any export-specific elements
      const hiddenElements = element.querySelectorAll('.export-only');
      hiddenElements.forEach(el => el.classList.remove('hidden'));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a',
        logging: false,
        windowWidth: element.scrollWidth,
      });
      
      // Restore styles
      element.style.backgroundColor = originalBg;
      hiddenElements.forEach(el => el.classList.add('hidden'));

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const pdfWidth = 210;
      const pdfHeight = 297;
      const marginX = 10;
      const marginY = 10;
      
      const imgWidth = pdfWidth - (marginX * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = marginY;

      pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - marginY * 2);

      while (heightLeft > 0) {
        position = position - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Relatorio_NitedSync_${dateFrom}_${dateTo}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const statsCounts = {
    backlog:     activities.filter(a => a.status === 'backlog').length,
    em_execucao: activities.filter(a => a.status === 'em_execucao').length,
    em_revisao:  activities.filter(a => a.status === 'em_revisao').length,
    finalizado:  activities.filter(a => a.status === 'finalizado').length,
    alta:        activities.filter(a => a.priority === 'alta').length,
    media:       activities.filter(a => a.priority === 'media').length,
    baixa:       activities.filter(a => a.priority === 'baixa').length,
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-1">Relatórios</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            {isAdmin ? 'Visão geral de toda a equipe' : isSupervisor ? `Equipe: ${profile?.sector}` : 'Suas atividades'}
          </p>
        </div>
        <button
          onClick={exportToPDF}
          disabled={exporting}
          className="flex items-center gap-2 px-5 py-3 bg-white/[0.03] hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 rounded-2xl text-xs font-black uppercase tracking-widest border border-white/5 hover:border-indigo-500/20 transition-all active:scale-95 disabled:opacity-30"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Exportando...' : 'Exportar PDF'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface-panel border border-white/5 rounded-3xl p-6 mb-8 space-y-5">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date from */}
          <div>
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">De</label>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-base/50 border border-white/5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-transparent text-sm text-white outline-none w-full"
              />
            </div>
          </div>

          {/* Date to */}
          <div>
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Até</label>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-base/50 border border-white/5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setDateTo(e.target.value)}
                className="bg-transparent text-sm text-white outline-none w-full"
              />
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Status Kanban</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as ActivityStatus | 'todas')}
              className="w-full px-4 py-2.5 bg-surface-base/50 border border-white/5 rounded-xl text-sm text-white outline-none cursor-pointer"
            >
              <option value="todas" className="bg-surface-panel">Todos os status</option>
              <option value="backlog" className="bg-surface-panel">Backlog</option>
              <option value="em_execucao" className="bg-surface-panel">Em Execução</option>
              <option value="em_revisao" className="bg-surface-panel">Em Revisão</option>
              <option value="finalizado" className="bg-surface-panel">Finalizado</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Prioridade</label>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value as ActivityPriority | 'todas')}
              className="w-full px-4 py-2.5 bg-surface-base/50 border border-white/5 rounded-xl text-sm text-white outline-none cursor-pointer"
            >
              <option value="todas" className="bg-surface-panel">Todas</option>
              <option value="alta" className="bg-surface-panel">Alta</option>
              <option value="media" className="bg-surface-panel">Média</option>
              <option value="baixa" className="bg-surface-panel">Baixa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report content (captured for PDF) */}
      <div ref={reportRef} className="space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(Object.keys(STATUS_LABELS) as ActivityStatus[]).map(status => (
            <div key={status} className={cn("p-4 rounded-2xl border", STATUS_COLORS[status])}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-70">{STATUS_LABELS[status]}</p>
              <p className="text-2xl font-black">{statsCounts[status]}</p>
            </div>
          ))}
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 p-1 bg-surface-panel/50 rounded-2xl border border-white/5 w-fit">
          <button
            onClick={() => setMode('activities')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              mode === 'activities' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Atividades Kanban
          </button>
          <button
            onClick={() => setMode('daily')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              mode === 'daily' ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            Atividades Diárias
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : mode === 'activities' ? (
          // Activities table
          <div className="bg-surface-panel border border-white/5 rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Atividades do Kanban</h3>
              <span className="text-[10px] font-bold text-slate-500">{activities.length} itens</span>
            </div>
            {activities.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold">Nenhuma atividade encontrada</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {activities.map(act => (
                  <div key={act.id} className="px-6 py-4 flex items-start gap-4">
                    <div className={cn("mt-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border shrink-0", STATUS_COLORS[act.status])}>
                      {STATUS_LABELS[act.status]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{act.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Criado por {act.creatorName}
                        {act.assigneeName && ` • Responsável: ${act.assigneeName}`}
                        {act.dueDate && ` • Prazo: ${new Date(act.dueDate).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0", PRIORITY_COLORS[act.priority])}>
                      {act.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Daily entries table
          <div className="bg-surface-panel border border-white/5 rounded-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Atividades Diárias</h3>
              <span className="text-[10px] font-bold text-slate-500">{dailyEntries.length} registros</span>
            </div>
            {dailyEntries.length === 0 ? (
              <div className="text-center py-16 text-slate-600">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold">Nenhum registro no período</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {dailyEntries.map(entry => (
                  <div key={entry.id} className="px-6 py-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-sm text-slate-400 shrink-0">
                      {entry.userName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-white">{entry.userName}</p>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">{entry.sector}</span>
                      </div>
                      <p className="text-sm text-slate-300">{entry.description}</p>
                      {entry.linkedActivityTitle && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-indigo-400">
                          <Link2 className="w-3 h-3" />
                          <span className="text-[11px]">{entry.linkedActivityTitle}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 shrink-0">
                      {entry.date}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
