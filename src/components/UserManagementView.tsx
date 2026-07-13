/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuth } from './FirebaseProvider';
import { useSettings } from '../lib/useSettings';
import { UserProfile, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Users, Plus, Pencil, Trash2, X, Shield, Briefcase, User2,
  Search, Save, AlertTriangle, Loader2, Tag, GripVertical
} from 'lucide-react';

const ROLE_CONFIG = {
  admin:       { label: 'Administrador', color: 'text-indigo-400', bg: 'bg-indigo-500/20', icon: Shield },
  supervisor:  { label: 'Supervisor',    color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: Briefcase },
  colaborador: { label: 'Colaborador',   color: 'text-amber-400',   bg: 'bg-amber-500/20',   icon: User2 },
};


interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  sector: string;
  groupId: string;
}

const DEFAULT_FORM: UserFormData = {
  name: '', email: '', password: '', role: 'colaborador', sector: '', groupId: ''
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-surface-panel border border-white/10 rounded-[32px] shadow-2xl">
            <div className="flex items-center justify-between px-8 pt-8 pb-6 border-b border-white/5">
              <h2 className="text-lg font-black text-white">{title}</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            {children}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export const UserManagementView: React.FC = () => {
  const { allUsers, createUser, updateUser, deleteUser, refreshUsers, profile } = useAuth();
  const { settings } = useSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'todos'>('todos');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  
  const [formData, setFormData] = useState<UserFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filteredUsers = allUsers.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        u.sector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'todos' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const openCreate = () => {
    setFormData(DEFAULT_FORM);
    setIsCreateOpen(true);
  };

  const openEdit = (user: UserProfile) => {
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      sector: user.sector,
      groupId: user.groupId || 'dev',
    });
    setEditingUser(user);
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.email.trim()) return;
    setSaving(true);
    try {
      await createUser(formData);
      setIsCreateOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingUser || !formData.name.trim()) return;
    setSaving(true);
    try {
      await updateUser(editingUser.uid, formData);
      setEditingUser(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await deleteUser(deletingUser.uid);
      setDeletingUser(null);
    } finally {
      setDeleting(false);
    }
  };

  const renderFormContent = (isEditing: boolean) => (
    <form onSubmit={(e) => { e.preventDefault(); isEditing ? handleEdit() : handleCreate(); }} className="px-8 py-6 space-y-4">
      <div>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
          Nome <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
          placeholder="Ex: João da Silva"
          className="w-full px-4 py-3 bg-surface-base/50 border border-white/5 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
        />
      </div>
      <div>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
          E-mail <span className="text-rose-500">*</span>
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
          placeholder="joao@empresa.com"
          className="w-full px-4 py-3 bg-surface-base/50 border border-white/5 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
        />
      </div>
      {!isEditing && (
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
            Senha {!isEditing && <span className="text-rose-500">*</span>} {isEditing && '(Opcional para alterar)'}
          </label>
          <input
            type="password"
            required={!isEditing}
            value={formData.password}
            onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
            placeholder="Senha para o novo usuário"
            minLength={6}
            className="w-full px-4 py-3 bg-surface-base/50 border border-white/5 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Perfil</label>
          <select
            value={formData.role}
            onChange={e => setFormData(p => ({ ...p, role: e.target.value as UserRole }))}
            disabled={isEditing && editingUser?.uid === profile?.uid}
            title={isEditing && editingUser?.uid === profile?.uid ? "Você não pode alterar o seu próprio papel" : ""}
            className="w-full px-4 py-3 bg-surface-base/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="admin" className="bg-surface-panel">Admin</option>
            <option value="supervisor" className="bg-surface-panel">Supervisor</option>
            <option value="colaborador" className="bg-surface-panel">Colaborador</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
            Setor <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={formData.sector}
            onChange={e => setFormData(p => ({ ...p, sector: e.target.value }))}
            className="w-full px-4 py-3 bg-surface-base/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
          >
            <option value="" disabled>Selecione um Setor</option>
            {settings.sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
          Grupo de Acesso <span className="text-rose-500">*</span>
        </label>
        <select
          required
          value={formData.groupId}
          onChange={e => setFormData(p => ({ ...p, groupId: e.target.value }))}
          className="w-full px-4 py-3 bg-surface-base/50 border border-white/5 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 transition-all cursor-pointer"
        >
          <option value="" disabled>Selecione um Grupo</option>
          {settings.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || !formData.name.trim() || !formData.email.trim() || (!isEditing && !formData.password?.trim())}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-3 rounded-2xl font-black text-sm transition-all active:scale-95"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Usuário'}
        </button>
        <button
          type="button"
          onClick={() => { setIsCreateOpen(false); setEditingUser(null); }}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl font-bold text-sm transition-all"
        >
          Cancelar
        </button>
      </div>
    </form>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-1">Gerenciamento de Usuários</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            {allUsers.length} usuários cadastrados
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome, email ou setor..."
            className="w-full pl-11 pr-4 py-3 bg-surface-panel border border-white/5 rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/30 transition-all"
          />
        </div>
        <div className="flex gap-1 p-1 bg-surface-panel border border-white/5 rounded-2xl">
          {(['todos', 'admin', 'supervisor', 'colaborador'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                roleFilter === r ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map(u => {
          const rc = ROLE_CONFIG[u.role];
          const Ic = rc.icon;
          const isSelf = u.uid === profile?.uid;
          return (
            <motion.div
              key={u.uid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "bg-surface-panel border rounded-3xl p-5 flex flex-col gap-4 transition-all hover:border-white/10",
                isSelf ? "border-indigo-500/20" : "border-white/5"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg", rc.bg, rc.color)}>
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">{u.name}</h3>
                    {isSelf && <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-black px-1.5 py-0.5 rounded-md shrink-0">Você</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest", rc.bg, rc.color)}>
                  <Ic className="w-3 h-3" />
                  {rc.label}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-400 bg-white/5">
                  {u.sector}
                </span>
              </div>

              <div className="flex gap-2 pt-1 border-t border-white/5">
                <button
                  onClick={() => openEdit(u)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => setDeletingUser(u)}
                  disabled={isSelf}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-20">
          <Users className="w-10 h-10 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">Nenhum usuário encontrado</p>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Novo Usuário">
        {renderFormContent(false)}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Editar Usuário">
        {renderFormContent(true)}
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deletingUser} onClose={() => setDeletingUser(null)} title="Confirmar Exclusão">
        <div className="px-8 py-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <p className="text-white font-bold mb-2">Tem certeza?</p>
              <p className="text-slate-400 text-sm">
                Você está prestes a excluir o usuário <span className="text-white font-bold">{deletingUser?.name}</span>. 
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white py-3 rounded-2xl font-black text-sm transition-all"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? 'Excluindo...' : 'Sim, excluir'}
            </button>
            <button
              onClick={() => setDeletingUser(null)}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl font-bold text-sm transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
