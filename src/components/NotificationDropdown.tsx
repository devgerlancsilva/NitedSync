/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, AlertCircle, Clock, Trash2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './FirebaseProvider';
import { AppNotification } from '../types';
import { cn } from '../lib/utils';

export const NotificationDropdown: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AppNotification[];
      setNotifications(docs);
    }, (error) => {
      console.error("NotificationDropdown: Snapshot error", error);
    });

    return () => unsubscribe();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-3 rounded-xl border transition-all active:scale-95 group",
          isOpen 
            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" 
            : "bg-white/[0.02] border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]"
        )}
      >
        <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-surface-panel shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
              className="absolute right-0 mt-4 w-[380px] bg-surface-panel/95 backdrop-blur-2xl rounded-[32px] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Notificações</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Atualizações em tempo real</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-indigo-400 font-black bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 uppercase">
                    {unreadCount} Novas
                  </span>
                </div>
              </div>

              <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-24 px-12 text-center">
                    <div className="w-16 h-16 bg-white/[0.02] rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <Bell className="w-8 h-8 text-slate-800 opacity-20" />
                    </div>
                    <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.3em]">Tudo limpo por aqui</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.03]">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-6 transition-all group relative",
                          !notification.read ? "bg-indigo-500/[0.03]" : "hover:bg-white/[0.01]"
                        )}
                      >
                        <div className="flex gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                            notification.type === 'mensagem'
                              ? "bg-emerald-500/10 text-emerald-400"
                              : notification.type === 'atribuicao' 
                                ? "bg-indigo-500/10 text-indigo-400" 
                                : "bg-amber-500/10 text-amber-400"
                          )}>
                            {notification.type === 'mensagem' 
                              ? <MessageSquare className="w-5 h-5" /> 
                              : notification.type === 'atribuicao' 
                                ? <AlertCircle className="w-5 h-5" /> 
                                : <Clock className="w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs font-black text-white tracking-tight uppercase">{notification.title}</p>
                              <span className="text-[9px] text-slate-600 font-mono font-bold">
                                {notification.createdAt?.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{notification.message}</p>
                            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">
                              {notification.createdAt?.toDate().toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-xl transition-all"
                              title="Marcar como lida"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="w-8 h-8 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {notifications.length > 0 && (
                <div className="p-4 bg-white/[0.01] border-t border-white/5 text-center">
                  <button className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] hover:text-indigo-400 transition-colors">
                    Ver todas as atividades
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
