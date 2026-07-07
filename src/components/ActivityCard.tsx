/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Activity, ActivityStatus, UserRole, Comment } from '../types';
import { User, Clock, UserCheck, ChevronRight, Trash2, CheckCircle2, MessageSquare, AlertCircle, ChevronDown, Send } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './FirebaseProvider';
import { updateDoc, doc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface ActivityCardProps {
  activity: Activity;
  onStatusChange: (id: string, newStatus: ActivityStatus) => void;
  onAssignToMe: (id: string) => void;
  onJoinAsHelper: (id: string) => void;
  onToggleChecklistItem: (activityId: string, itemId: string) => void;
  onDelete: (id: string) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onStatusChange, onAssignToMe, onJoinAsHelper, onToggleChecklistItem, onDelete }) => {
  const { user, profile } = useAuth();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [newComment, setNewComment] = React.useState('');
  
  const isCreator = user?.uid === activity.createdBy;
  const isAssignee = activity.assignees?.some(a => a.uid === user?.uid) || user?.uid === activity.assigneeId;
  const isCollaborator = activity.collaborators?.some(c => c.uid === user?.uid);
  
  const isSupervisor = profile?.role === 'supervisor';
  const isAdmin = profile?.role === 'admin';

  const priorityColors = {
    baixa: 'bg-emerald-500 shadow-emerald-500/20',
    media: 'bg-amber-500 shadow-amber-500/20',
    alta: 'bg-rose-500 shadow-rose-500/20',
  };

  const checklist = activity.checklist || [];
  const completedCount = checklist.filter(i => i.completed).length;
  const progress = checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      const comment: Comment = {
        id: crypto.randomUUID(),
        userId: user.uid,
        userName: user.displayName || user.email || 'Usuário',
        text: newComment.trim(),
        createdAt: new Date(),
      };

      await updateDoc(doc(db, 'activities', activity.id), {
        comments: arrayUnion(comment),
        updatedAt: serverTimestamp(),
      });
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `activities/${activity.id}/comments`);
    }
  };

  const getDeadlineStatus = () => {
    if (!activity.dueDate || activity.status === 'finalizado') return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(activity.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Atrasado', color: 'text-rose-400', icon: AlertCircle };
    if (diffDays === 0) return { label: 'Hoje', color: 'text-amber-400', icon: Clock };
    if (diffDays <= 2) return { label: `${diffDays} dias`, color: 'text-indigo-400', icon: Clock };
    return { label: `${diffDays} dias`, color: 'text-slate-500', icon: Clock };
  };

  const deadline = getDeadlineStatus();
  const needsSupervisorApproval = activity.status === 'em_revisao' && (isSupervisor || isAdmin);

  return (
    <motion.div
      layout
      whileHover={{ y: -2 }}
      className={cn(
        "bg-surface-card border rounded-3xl p-6 shadow-xl shadow-black/20 hover:shadow-indigo-500/10 transition-all group overflow-hidden",
        needsSupervisorApproval ? "border-indigo-500 shadow-indigo-500/10" : "border-white/[0.03]"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/5">
            <div className={cn("w-2 h-2 rounded-full", priorityColors[activity.priority])} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activity.priority}</span>
          </div>
          {activity.category && (
            <div className="flex items-center px-3 py-1 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{activity.category}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isAdmin && (
            <button 
              onClick={() => onDelete(activity.id)}
              className="p-1.5 hover:bg-rose-500/10 text-slate-600 hover:text-rose-400 rounded-lg transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div onClick={() => setIsExpanded(!isExpanded)} className="cursor-pointer">
        <h3 className="text-sm md:text-base font-bold text-white mb-2 leading-tight tracking-tight group-hover:text-indigo-400 transition-colors">
          {activity.title}
        </h3>
        
        {needsSupervisorApproval && (
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <UserCheck className="w-3 h-3" />
            Aguardando sua aprovação
          </p>
        )}

        <p className="text-xs text-slate-400 mb-6 line-clamp-2 leading-relaxed font-medium">
          {activity.description || "Sem descrição detalhada."}
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {(activity.assignees && activity.assignees.length > 0) ? (
              activity.assignees.map((a, i) => (
                <div 
                  key={a.uid}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase border-2 border-surface-card shadow-lg transition-transform hover:scale-110",
                    a.uid === user?.uid ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                  )}
                  style={{ zIndex: 10 - i }}
                  title={`Responsável: ${a.name}`}
                >
                  {a.name?.charAt(0)}
                </div>
              ))
            ) : activity.assigneeId ? (
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase border-2 border-surface-card shadow-lg",
                  isAssignee ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
                )}
                title={`Responsável: ${activity.assigneeName}`}
              >
                {activity.assigneeName?.charAt(0)}
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-dashed border-white/10 flex items-center justify-center text-slate-700">
                <User className="w-3 h-3" />
              </div>
            )}
            {activity.collaborators?.map((c, i) => (
              <div 
                key={c.uid} 
                className="w-8 h-8 rounded-full bg-slate-800 border-2 border-surface-card flex items-center justify-center text-[10px] font-black text-slate-500 uppercase shadow-lg transition-transform hover:scale-110" 
                title={`Colaborador: ${c.name}`}
              >
                {c.name.charAt(0)}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
             <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                activity.comments && activity.comments.length > 0 ? "text-indigo-400" : "text-slate-600 hover:text-slate-400"
              )}
             >
               <MessageSquare className="w-3.5 h-3.5" />
               <span className="text-[10px] font-bold">{activity.comments?.length || 0}</span>
             </button>
             {deadline && (
               <div className={cn("flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-widest", deadline.color)}>
                 <deadline.icon className="w-3.5 h-3.5" />
                 <span>{deadline.label}</span>
               </div>
             )}
          </div>
        </div>
        
        {checklist.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/[0.03] pt-6 space-y-6"
          >
            {/* Checklist items in expanded view */}
            {checklist.length > 0 && (
              <div className="space-y-3">
                <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">Checklist detalhado</span>
                <div className="space-y-2">
                  {checklist.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onToggleChecklistItem(activity.id, item.id)}
                      className="w-full flex items-center gap-3 py-2 px-3 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl group/item text-left transition-colors border border-transparent hover:border-white/5"
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-lg border flex items-center justify-center transition-all shrink-0",
                        item.completed 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "bg-white/5 border-white/10"
                      )}>
                        {item.completed && <CheckCircle2 className="w-2.5 h-2.5" />}
                      </div>
                      <span className={cn(
                        "text-[11px] font-medium transition-all",
                        item.completed ? "text-slate-600 line-through" : "text-slate-400"
                      )}>
                        {item.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="space-y-4">
              <span className="text-[9px] text-slate-600 font-black uppercase tracking-[0.2em]">Comentários</span>
              <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                {activity.comments?.map((comment) => (
                  <div key={comment.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-indigo-400 uppercase">{comment.userName}</span>
                      <span className="text-[8px] text-slate-600 uppercase font-bold">Hoje</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{comment.text}</p>
                  </div>
                ))}
                {(!activity.comments || activity.comments.length === 0) && (
                  <p className="text-[10px] text-slate-700 italic">Nenhum comentário ainda.</p>
                )}
              </div>
              
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreva algo..."
                  className="flex-1 bg-surface-base border border-white/5 rounded-xl px-4 py-2 text-[11px] text-white focus:outline-none focus:border-indigo-500/30 transition-all"
                />
                <button 
                  type="submit"
                  disabled={!newComment.trim()}
                  className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activity.status !== 'finalizado' && (
        <div className="grid grid-cols-2 gap-3 mt-auto pt-6 border-t border-white/[0.03]">
          {!isAssignee && (
            <button
              onClick={() => onAssignToMe(activity.id)}
              className="flex items-center justify-center gap-2 py-2.5 bg-white/[0.03] hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-white/5 hover:border-indigo-500/20 transition-all active:scale-95 flex-1"
            >
              Assumir
            </button>
          )}
          {!isAssignee && !isCollaborator && (
            <button
              onClick={() => onJoinAsHelper(activity.id)}
              className="flex items-center justify-center gap-2 py-2.5 bg-white/[0.03] hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-white/5 hover:border-emerald-500/20 transition-all active:scale-95 flex-1"
            >
              Ajudar
            </button>
          )}
          <div className="relative group/status flex-1 col-span-2 mt-1">
            <select
              value={activity.status}
              onChange={(e) => onStatusChange(activity.id, e.target.value as ActivityStatus)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/[0.03] hover:bg-white/5 text-slate-400 hover:text-slate-200 rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-white/5 transition-all cursor-pointer appearance-none text-center"
            >
              <option value="backlog">Mover para Backlog</option>
              <option value="em_execucao">Mover para Execução</option>
              <option value="em_revisao">Enviar para Revisão</option>
              <option value="finalizado">Finalizar Tarefa</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
