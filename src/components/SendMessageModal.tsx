/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Loader2, MessageSquare } from 'lucide-react';
import { collection, query, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './FirebaseProvider';
import { UserProfile } from '../types';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen && profile) {
      fetchUsers();
    }
  }, [isOpen, profile]);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const q = query(collection(db, 'profiles'));
      const snap = await getDocs(q);
      let loadedUsers = snap.docs.map(d => d.data() as UserProfile);

      // Regra de filtro:
      // Admins podem ver todos
      // Supervisores só podem mandar mensagem pra quem é do mesmo groupId
      if (profile?.role === 'supervisor') {
        loadedUsers = loadedUsers.filter(u => u.groupId === profile.groupId && u.uid !== profile.uid);
      } else if (profile?.role === 'admin') {
        loadedUsers = loadedUsers.filter(u => u.uid !== profile.uid);
      }

      setUsers(loadedUsers);
    } catch (e) {
      console.error('Erro ao buscar usuários', e);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientId || !message.trim() || !profile) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: recipientId,
        title: `Recado de ${profile.name.split(' ')[0]}`,
        message: message.trim(),
        type: 'mensagem',
        activityId: 'geral',
        read: false,
        createdAt: serverTimestamp()
      });
      setMessage('');
      setRecipientId('');
      onClose();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-surface-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white tracking-wide">Enviar Recado</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  Comunicação Direta
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Destinatário
              </label>
              {fetching ? (
                <div className="text-[11px] text-slate-400">Carregando colaboradores...</div>
              ) : (
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-base border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all appearance-none"
                  required
                >
                  <option value="" disabled>Selecione um colaborador...</option>
                  {users.map(u => (
                    <option key={u.uid} value={u.uid}>
                      {u.name} ({u.sector})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Mensagem
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva seu recado aqui..."
                rows={4}
                className="w-full px-4 py-3 bg-surface-base border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !recipientId || !message.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black tracking-wide transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar Recado
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
