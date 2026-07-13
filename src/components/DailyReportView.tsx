import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from './FirebaseProvider';
import { DailyEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Search, Send, Clock, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const DailyReportView: React.FC = () => {
  const { user, profile } = useAuth();
  const [activity, setActivity] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyLogs, setDailyLogs] = useState<DailyEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [myTodayLog, setMyTodayLog] = useState<DailyEntry | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'supervisor';
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'daily_status'),
      where('date', '==', selectedDate),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DailyEntry[];
      setDailyLogs(logs);

      if (selectedDate === todayStr) {
        const myLog = logs.find(l => l.userId === user.uid);
        setMyTodayLog(myLog || null);
      }
    });

    return () => unsubscribe();
  }, [selectedDate, user, todayStr]);

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const element = reportRef.current;
      
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = '#0f172a'; // Ensure dark background is captured
      
      const hiddenElements = element.querySelectorAll('.export-only');
      hiddenElements.forEach((el: any) => el.classList.remove('hidden'));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a', // Match surface-base
        logging: false,
      });
      
      element.style.backgroundColor = originalBg;
      hiddenElements.forEach((el: any) => el.classList.add('hidden'));

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Relatorio_Diario_NitedSync_${selectedDate}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !activity.trim()) return;

    setLoading(true);
    try {
      const statusData: DailyEntry = {
        userId: user.uid,
        userName: profile.name,
        userRole: profile.role,
        sector: profile.sector,
        groupId: (profile as any).groupId || profile.sector.toLowerCase(),
        description: activity.trim(),
        date: todayStr,
        linkedActivityId: null,
        linkedActivityTitle: null,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'daily_entries', `${user.uid}_${todayStr}`), statusData);
      setActivity('');
      setMyTodayLog(statusData);
    } catch (error) {
      console.error("Error saving daily status:", error);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight mb-2">Relatório Diário</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            {isAdmin ? 'Acompanhamento de Equipe' : 'O que você está fazendo hoje?'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-surface-panel border border-white/5 p-2 rounded-2xl">
            <button 
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
              />
            </div>
            <button 
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={exportToPDF}
            disabled={exporting || dailyLogs.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-white/[0.03] hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/5 hover:border-indigo-500/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {exporting ? <Clock className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exportando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isAdmin && selectedDate === todayStr && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-12"
          >
            <form onSubmit={handleSubmitActivity} className="relative">
              <div className="bg-surface-panel border border-white/5 rounded-3xl p-6 shadow-2xl">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
                  Sua Atividade Principal Hoje
                </label>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={activity}
                    onChange={(e) => setActivity(e.target.value)}
                    placeholder={myTodayLog ? "Atualize sua atividade..." : "Ex: Revisando as métricas do setor financeiro..."}
                    className="flex-1 bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={loading || !activity.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95"
                  >
                    {loading ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    <span>{myTodayLog ? 'Atualizar' : 'Enviar'}</span>
                  </button>
                </div>
                {myTodayLog && (
                  <div className="mt-4 flex items-center gap-2 text-indigo-400">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Atividade atual registrada</p>
                  </div>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={reportRef} className="space-y-6 p-4 -m-4 rounded-[40px]">
        {/* PDF Header (Hidden in UI, visible in PDF capture if scale/bg handled) */}
        <div className="hidden export-only flex items-center justify-between mb-8 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
             <FileText className="w-8 h-8 text-indigo-500" />
             <h1 className="text-2xl font-black text-white">NitedSync - Relatório Diário</h1>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Data do Relatório</p>
            <p className="text-white font-bold">{selectedDate}</p>
          </div>
        </div>

        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">
            {selectedDate === todayStr ? 'Atividades de Hoje' : `Atividades em ${selectedDate}`}
          </h3>
          <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
            {dailyLogs.length} Registros
          </span>
        </div>

        <div className="grid gap-4">
          {dailyLogs.length > 0 ? (
            dailyLogs.map((log) => (
              <motion.div 
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={log.id}
                className={cn(
                  "group p-6 bg-surface-panel border border-white/5 rounded-3xl transition-all hover:border-white/10",
                  log.userId === user?.uid && "border-indigo-500/30 bg-indigo-500/[0.02]"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg",
                    log.userRole === 'admin' ? "bg-indigo-500/20 text-indigo-400" :
                    log.userRole === 'supervisor' ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-slate-800 text-slate-500"
                  )}>
                    {log.userName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {log.userName}
                          {log.userId === user?.uid && <span className="ml-2 text-[9px] text-indigo-500 font-black uppercase">Você</span>}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{log.sector} • {log.userRole}</p>
                      </div>
                      <div className="text-right">
                         <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                           <Clock className="w-3 h-3" />
                           {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recente'}
                         </span>
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed font-medium bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                      {log.activity}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-surface-panel/50 border border-dashed border-white/5 rounded-[40px]">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-700" />
              </div>
              <p className="text-slate-600 text-sm font-bold uppercase tracking-widest">Nenhum registro encontrado</p>
              <p className="text-slate-700 text-xs mt-2">Ninguém postou atividades para este dia ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
