/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useCategories } from '../lib/useCategories';
import { X, AlertCircle, Calendar, Tag, UserPlus, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ActivityPriority } from '../types';
import { useAuth } from './FirebaseProvider';

interface NewActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, priority: ActivityPriority, category: string | null, dueDate: string | null, assignee: { id: string | null, name: string | null } | null, checklist: Array<{ id: string, text: string, completed: boolean }>) => void;
}

// Categories are now managed via Firestore — see useCategories hook

export const NewActivityModal: React.FC<NewActivityModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ActivityPriority>('media');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignToMe, setAssignToMe] = useState(true);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState('');

  const handleAddItem = () => {
    if (newItemText.trim()) {
      setChecklistItems([...checklistItems, newItemText.trim()]);
      setNewItemText('');
    }
  };

  const handleRemoveItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    const assignee = assignToMe 
      ? { id: user.uid, name: user.displayName || user.email }
      : null;

    const checklist = checklistItems.map(text => ({
      id: crypto.randomUUID(),
      text,
      completed: false
    }));

    onSubmit(title, description, priority, category || null, dueDate || null, assignee, checklist);
    setTitle('');
    setDescription('');
    setPriority('media');
    setCategory('');
    setDueDate('');
    setAssignToMe(true);
    setChecklistItems([]);
    onClose();
  };

  const priorityOptions: { value: ActivityPriority; label: string; color: string }[] = [
    { value: 'baixa', label: 'Baixa', color: 'bg-emerald-500' },
    { value: 'media', label: 'Média', color: 'bg-amber-500' },
    { value: 'alta', label: 'Alta', color: 'bg-rose-500' },
  ];

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
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative w-full max-w-xl bg-surface-panel rounded-[32px] shadow-2xl overflow-hidden border border-white/5 max-h-[90vh] flex flex-col"
          >
            <div className="flex justify-between items-center p-8 border-b border-white/5 bg-white/[0.02]">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Nova Atividade</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Defina os parâmetros da demanda</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Título da Atividade
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Redesign do Dashboard"
                  className="w-full px-5 py-4 bg-surface-base border border-white/5 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Descrição
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes sobre o que precisa ser feito..."
                  rows={3}
                  className="w-full px-5 py-4 bg-surface-base border border-white/5 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all text-sm font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    <Tag className="w-3 h-3 text-indigo-400" /> Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-base border border-white/5 rounded-2xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium"
                  >
                    <option value="" className="bg-surface-panel">Selecione...</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat} className="bg-surface-panel">{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    <Calendar className="w-3 h-3 text-indigo-400" /> Prazo
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-base border border-white/5 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-4 bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <UserPlus className="w-3 h-3 text-indigo-400" /> Atribuição
                  </label>
                  <button
                    type="button"
                    onClick={() => setAssignToMe(!assignToMe)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                      assignToMe 
                        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
                        : "bg-white/5 border-white/5 text-slate-500"
                    )}
                  >
                    {assignToMe ? 'Para Mim' : 'Sem Responsável'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 font-medium italic">
                  {assignToMe 
                    ? "Você será o responsável principal por esta atividade." 
                    : "A atividade ficará disponível para qualquer colaborador assumir."}
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Sub-tarefas (Checklist)
                </label>
                <div className="space-y-2">
                  {checklistItems.map((item, index) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={index} 
                      className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-3 group/item"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                        <span className="text-xs text-slate-300 font-medium">{item}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveItem(index)}
                        className="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-rose-500/10 rounded-lg transition-all text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                    placeholder="Adicionar item..."
                    className="flex-1 px-5 py-4 bg-surface-base border border-white/5 rounded-2xl text-sm text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-6 bg-white/5 hover:bg-white/10 text-indigo-400 text-xs font-black uppercase tracking-widest rounded-2xl border border-white/5 transition-all"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Prioridade
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {priorityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all relative overflow-hidden group",
                        priority === opt.value
                          ? "bg-indigo-500/5 border-indigo-500/30 ring-1 ring-indigo-500/30"
                          : "bg-surface-base border-white/5 hover:border-white/10"
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", opt.color)} />
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest transition-colors",
                        priority === opt.value ? "text-white" : "text-slate-500"
                      )}>{opt.label}</span>
                      {priority === opt.value && (
                        <div className="absolute top-0 right-0 p-1">
                          <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            <div className="p-8 bg-white/[0.02] border-t border-white/5 flex gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-black uppercase tracking-widest rounded-2xl border border-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-[2] px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-900/20 transition-all active:scale-95"
              >
                Criar Atividade
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
