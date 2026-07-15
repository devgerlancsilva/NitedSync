/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../lib/useSettings';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, saveSettings, loading } = useSettings();
  
  // Local state for editing before saving
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'groups' | 'categories' | 'sprints'>('groups');

  // Sync when settings load
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(localSettings);
    setSaving(false);
    onClose();
  };

  const addGroup = () => {
    const id = `grupo-${Date.now()}`;
    setLocalSettings(s => ({ ...s, groups: [...s.groups, { id, name: 'Novo Grupo' }] }));
  };

  const removeGroup = (idx: number) => {
    setLocalSettings(s => ({ ...s, groups: s.groups.filter((_, i) => i !== idx) }));
  };

  const updateGroup = (idx: number, name: string) => {
    const updated = [...localSettings.groups];
    updated[idx] = { ...updated[idx], name };
    setLocalSettings(s => ({ ...s, groups: updated }));
  };

  const addCategory = () => {
    setLocalSettings(s => ({ ...s, categories: [...s.categories, 'Nova Categoria'] }));
  };

  const removeCategory = (idx: number) => {
    setLocalSettings(s => ({ ...s, categories: s.categories.filter((_, i) => i !== idx) }));
  };

  const updateCategory = (idx: number, value: string) => {
    const updated = [...localSettings.categories];
    updated[idx] = value;
    setLocalSettings(s => ({ ...s, categories: updated }));
  };
  
  const addSprint = () => {
    const id = Date.now().toString();
    setLocalSettings(s => ({ 
      ...s, 
      sprints: [...s.sprints, { id, name: 'Nova Sprint', startDate: '', endDate: '' }] 
    }));
  };

  const updateSprint = (idx: number, field: 'name' | 'startDate' | 'endDate', value: string) => {
    const updated = [...localSettings.sprints];
    updated[idx] = { ...updated[idx], [field]: value };
    setLocalSettings(s => ({ ...s, sprints: updated }));
  };

  const removeSprint = (idx: number) => {
    setLocalSettings(s => ({ ...s, sprints: s.sprints.filter((_, i) => i !== idx) }));
  };

  const tabs = [
    { id: 'groups', label: 'Grupos / Setores' },
    { id: 'categories', label: 'Categorias de Tarefas' },
    { id: 'sprints', label: 'Sprints' }
  ] as const;

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-4xl bg-surface-panel rounded-[40px] shadow-2xl overflow-hidden border border-white/5 max-h-[90vh] flex flex-col"
        >
          <div className="flex justify-between items-center p-8 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-indigo-600/20 rounded-[24px] flex items-center justify-center border border-indigo-500/20 shadow-glow">
                <Settings2 className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Configurações do Sistema</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Gerenciamento Dinâmico</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-90 group">
              <X className="w-6 h-6 text-slate-600 group-hover:text-white transition-colors" />
            </button>
          </div>

          <div className="flex border-b border-white/5 px-8 pt-4 gap-4 bg-surface-panel/50">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                  activeTab === tab.id 
                    ? "border-indigo-500 text-indigo-400" 
                    : "border-transparent text-slate-500 hover:text-slate-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {loading ? (
              <div className="text-center text-slate-500 py-10">Carregando...</div>
            ) : (
              <div className="space-y-6">
                
                {activeTab === 'groups' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-slate-400">Os grupos definem as permissões de acesso dos supervisores aos colaboradores.</p>
                      <button onClick={addGroup} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all">
                        <Plus className="w-4 h-4" /> Novo Grupo
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {localSettings.groups.map((g, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-surface-base border border-white/5 rounded-2xl">
                          <div className="flex-1 mr-4">
                            <input
                              type="text"
                              value={g.name}
                              onChange={(e) => updateGroup(idx, e.target.value)}
                              placeholder="Nome do grupo"
                              className="w-full bg-transparent border-b border-transparent hover:border-white/20 focus:border-indigo-500 focus:outline-none text-sm font-bold text-white transition-colors pb-1"
                            />
                            <p className="text-xs text-slate-500 mt-1">ID: {g.id}</p>
                          </div>
                          <button onClick={() => removeGroup(idx)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {activeTab === 'categories' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-slate-400">Categorias usadas nas atividades do Kanban.</p>
                      <button onClick={addCategory} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all">
                        <Plus className="w-4 h-4" /> Nova Categoria
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {localSettings.categories.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-surface-base border border-white/5 rounded-2xl">
                          <input
                            type="text"
                            value={c}
                            onChange={(e) => updateCategory(idx, e.target.value)}
                            placeholder="Nome da categoria"
                            className="flex-1 bg-transparent border-b border-transparent hover:border-white/20 focus:border-indigo-500 focus:outline-none text-sm font-bold text-white transition-colors pb-1 mr-2"
                          />
                          <button onClick={() => removeCategory(idx)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'sprints' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-slate-400">Organize o trabalho em Sprints (períodos de tempo).</p>
                      <button onClick={addSprint} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all">
                        <Plus className="w-4 h-4" /> Nova Sprint
                      </button>
                    </div>
                    <div className="space-y-4">
                      {localSettings.sprints.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-4 bg-surface-base border border-white/5 rounded-2xl">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={s.name}
                              onChange={(e) => updateSprint(idx, 'name', e.target.value)}
                              placeholder="Nome da Sprint"
                              className="w-full bg-transparent border-b border-transparent hover:border-white/20 focus:border-indigo-500 focus:outline-none text-sm font-bold text-white mb-3 pb-1 transition-colors"
                            />
                            <div className="flex gap-4">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Início</label>
                                <input 
                                  type="date" 
                                  value={s.startDate}
                                  onChange={e => updateSprint(idx, 'startDate', e.target.value)}
                                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs" 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fim</label>
                                <input 
                                  type="date" 
                                  value={s.endDate}
                                  onChange={e => updateSprint(idx, 'endDate', e.target.value)}
                                  className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs" 
                                />
                              </div>
                            </div>
                          </div>
                          <button onClick={() => removeSprint(idx)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg self-start mt-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {localSettings.sprints.length === 0 && (
                        <p className="text-slate-500 text-sm italic">Nenhuma sprint cadastrada.</p>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          <div className="p-6 border-t border-white/5 bg-surface-panel/50 flex justify-end gap-3">
            <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-colors">
              Cancelar
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving || loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-black tracking-wide transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
