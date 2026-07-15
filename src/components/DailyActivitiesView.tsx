/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { useAuth } from './FirebaseProvider';
import { Activity, DailyEntry } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Send, Clock, ChevronLeft, ChevronRight, Plus, Link2,
  X, CheckSquare, Square, User2, Briefcase, ClipboardList
} from 'lucide-react';
import { cn } from '../lib/utils';

export const DailyActivitiesView: React.FC = () => {
  const { user, profile } = useAuth();

  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]); // Kanban activities for linking
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [linkedActivityId, setLinkedActivityId] = useState<string | null>(null);
  const [linkedActivityTitle, setLinkedActivityTitle] = useState<string | null>(null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  const todayStr = new Date().toLocaleDateString('en-CA'); // Gets YYYY-MM-DD in local time
  const isAdmin = profile?.role === 'admin';
  const isSupervisor = profile?.role === 'supervisor';
  const isColaborador = profile?.role === 'colaborador';
  const isToday = selectedDate === todayStr;

  // Fetch daily entries for selected date, filtered by role
  useEffect(() => {
    if (!user || !profile) return;

    let q;
    if (isAdmin) {
      // Admin sees everyone
      q = query(
        collection(db, 'daily_entries'),
        where('date', '==', selectedDate)
      );
    } else if (isSupervisor) {
      // Supervisor sees their group
      q = query(
        collection(db, 'daily_entries'),
        where('date', '==', selectedDate),
        where('groupId', '==', profile.groupId)
      );
    } else {
      // Colaborador sees only their own
      q = query(
        collection(db, 'daily_entries'),
        where('date', '==', selectedDate),
        where('userId', '==', user.uid)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyEntry));
      
      // Sort on client to avoid composite index requirements
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      
      setEntries(data);
    }, (err) => {
      console.error('Error fetching daily entries:', err);
    });

    return () => unsubscribe();
  }, [selectedDate, user, profile]);

  // Fetch kanban activities for the link picker
  useEffect(() => {
    if (!user || !profile) return;
    const q = query(collection(db, 'activities'), orderBy('updatedAt', 'desc'));
    getDocs(q).then(snap => {
      let acts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
      // Supervisors and Colaboradores só podem linkar com atividades do seu grupo
      if (!isAdmin && profile?.groupId) {
        acts = acts.filter(a => a.groupId === profile.groupId);
      }
      setActivities(acts);
    });
  }, [user, profile, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !description.trim()) return;

    setLoading(true);
    try {
      const entry: Omit<DailyEntry, 'id'> = {
        userId: user.uid,
        userName: profile.name,
        userRole: profile.role,
        sector: profile.sector,
        groupId: profile.groupId,
        description: description.trim(),
        date: selectedDate, // Use the currently viewed date, not just today
        linkedActivityId,
        linkedActivityTitle,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'daily_entries'), entry);
      setDescription('');
      setLinkedActivityId(null);
      setLinkedActivityTitle(null);
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', { 
      weekday: 'long', day: '2-digit', month: 'long' 
    });
  };

  const ROLE_COLORS: Record<string, string> = {
    admin:       'bg-indigo-500/20 text-indigo-400',
    supervisor:  'bg-emerald-500/20 text-emerald-400',
    colaborador: 'bg-slate-700 text-slate-400',
  };

  // Group entries by user for display
  const groupedEntries: Record<string, DailyEntry[]> = entries.reduce<Record<string, DailyEntry[]>>((acc, entry) => {
    if (!acc[entry.userId]) acc[entry.userId] = [];
    acc[entry.userId].push(entry);
    return acc;
  }, {});

  const myEntries = entries.filter(e => e.userId === user?.uid);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-1">Atividades Diárias</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            {isAdmin ? 'Acompanhamento de toda a equipe' : isSupervisor ? `Equipe: ${profile?.sector}` : 'Suas ações do dia'}
          </p>
        </div>

        {/* Date navigator */}
        <div className="flex items-center gap-2 bg-surface-panel border border-white/5 p-2 rounded-2xl">
          <button 
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
            />
          </div>
          <button 
            onClick={() => changeDate(1)}
            disabled={selectedDate >= todayStr}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date label */}
      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6 capitalize">
        {isToday ? '📅 Hoje — ' : ''}{formatDate(selectedDate)}
      </p>

      {/* Input form — allow retroactive entries */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-8"
        >
          <form onSubmit={handleSubmit} className="bg-surface-panel border border-white/5 rounded-3xl p-6 shadow-2xl">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">
              + Registrar ação realizada {isToday ? 'hoje' : 'neste dia'}
            </label>
              
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que você fez hoje... (ex: Finalizei o wireframe da tela de login, revisei o código do componente X...)"
                rows={3}
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all resize-none mb-4 text-sm"
              />

              {/* Link to Kanban activity */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1">
                  {linkedActivityId ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <Link2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-xs text-indigo-300 font-medium truncate">{linkedActivityTitle}</span>
                      <button 
                        type="button"
                        onClick={() => { setLinkedActivityId(null); setLinkedActivityTitle(null); }}
                        className="ml-auto text-indigo-400 hover:text-indigo-200"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowLinkPicker(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/[0.02] hover:bg-white/5 border border-dashed border-white/10 hover:border-white/20 rounded-xl transition-all text-xs text-slate-500 hover:text-slate-300 font-medium"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Vincular a uma atividade do Kanban (opcional)
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !description.trim()}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95 shrink-0"
                >
                  {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Registrar
                </button>
              </div>

              {/* Link picker modal */}
              <AnimatePresence>
                {showLinkPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mt-4 border border-white/10 rounded-2xl overflow-hidden max-h-60 overflow-y-auto"
                  >
                    <div className="sticky top-0 bg-surface-panel border-b border-white/5 px-4 py-3 flex items-center justify-between">
                      <p className="text-xs font-black text-white uppercase tracking-widest">Atividades do Kanban</p>
                      <button type="button" onClick={() => setShowLinkPicker(false)}>
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                    {activities.length === 0 ? (
                      <p className="text-center text-slate-600 text-xs py-6">Nenhuma atividade encontrada</p>
                    ) : (
                      activities.map(act => (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => {
                            setLinkedActivityId(act.id);
                            setLinkedActivityTitle(act.title);
                            setShowLinkPicker(false);
                          }}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/[0.03] text-left"
                        >
                          <div className={cn("mt-0.5 w-2 h-2 rounded-full shrink-0", {
                            'bg-rose-400': act.status === 'backlog',
                            'bg-amber-400': act.status === 'em_execucao',
                            'bg-indigo-400': act.status === 'em_revisao',
                            'bg-emerald-400': act.status === 'finalizado',
                          })} />
                          <div>
                            <p className="text-sm text-white font-medium">{act.title}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{act.status.replace('_', ' ')} • {act.priority}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>
      </AnimatePresence>

      {/* Entries */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white uppercase tracking-widest">
            {isToday ? 'Registros de hoje' : `Registros — ${formatDate(selectedDate)}`}
          </h3>
          <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
            {entries.length} {entries.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-20 bg-surface-panel/50 border border-dashed border-white/5 rounded-[32px]">
            <ClipboardList className="w-10 h-10 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-600 text-sm font-bold uppercase tracking-widest">Nenhum registro</p>
            <p className="text-slate-700 text-xs mt-2">
              Ninguém registrou atividades neste dia. Seja o primeiro a registrar acima!
            </p>
          </div>
        ) : (
          // Group by user
          (Object.entries(groupedEntries) as [string, DailyEntry[]][]).map(([userId, userEntries]) => {
            const firstEntry = userEntries[0];
            const isMe = userId === user?.uid;
            return (
              <motion.div
                key={userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-surface-panel border rounded-3xl overflow-hidden",
                  isMe ? "border-indigo-500/20" : "border-white/5"
                )}
              >
                {/* User header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm", ROLE_COLORS[firstEntry.userRole])}>
                    {firstEntry.userName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{firstEntry.userName}</h4>
                      {isMe && <span className="text-[9px] text-indigo-400 font-black uppercase bg-indigo-500/10 px-2 py-0.5 rounded-full">Você</span>}
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {firstEntry.sector} • {firstEntry.userRole}
                    </p>
                  </div>
                  <span className="ml-auto text-[10px] font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded-md">
                    {userEntries.length} {userEntries.length === 1 ? 'ação' : 'ações'}
                  </span>
                </div>

                {/* Entries */}
                <div className="divide-y divide-white/[0.03]">
                  {userEntries.map(entry => (
                    <div key={entry.id} className="px-6 py-4">
                      <p className="text-slate-300 text-sm leading-relaxed">{entry.description}</p>
                      {entry.linkedActivityId && (
                        <div className="flex items-center gap-2 mt-3 text-indigo-400">
                          <Link2 className="w-3 h-3" />
                          <span className="text-[11px] font-medium">{entry.linkedActivityTitle}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-700 mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {entry.createdAt?.toDate ? 
                          entry.createdAt.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 
                          'Recente'}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
