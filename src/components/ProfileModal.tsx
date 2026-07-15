import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User as UserIcon, Shield, Briefcase, Users, Mail, Hash } from 'lucide-react';
import { useAuth } from './FirebaseProvider';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();

  if (!isOpen || !profile) return null;

  const roleConfig = {
    admin:       { label: 'Administrador', color: 'text-indigo-400',  bg: 'bg-indigo-500/20',  icon: Shield },
    supervisor:  { label: 'Supervisor',    color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: Briefcase },
    colaborador: { label: 'Colaborador',   color: 'text-amber-400',   bg: 'bg-amber-500/20',   icon: Users },
  }[profile.role];

  const RoleIcon = roleConfig?.icon || UserIcon;

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
          className="relative w-full max-w-sm bg-surface-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shadow-inner">
                <UserIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white tracking-wide">Meu Perfil</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  Visualização de Conta
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

          {/* Content */}
          <div className="p-8 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-slate-800 border-4 border-surface-card shadow-2xl flex items-center justify-center text-4xl font-black text-white uppercase mb-6">
              {profile.name.charAt(0)}
            </div>

            <h3 className="text-xl font-black text-white tracking-tight mb-1">{profile.name}</h3>
            
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg ${roleConfig?.bg} border border-white/5 mb-8`}>
              <RoleIcon className={`w-3.5 h-3.5 ${roleConfig?.color}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${roleConfig?.color}`}>
                {roleConfig?.label}
              </span>
            </div>

            <div className="w-full space-y-4">
              <div className="flex items-center gap-3 p-4 bg-surface-base rounded-2xl border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">E-mail</p>
                  <p className="text-sm text-slate-200 font-medium truncate">{profile.email}</p>
                </div>
              </div>

              {profile.groupId && (
                <div className="flex items-center gap-3 p-4 bg-surface-base rounded-2xl border border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <Hash className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grupo / Setor</p>
                    <p className="text-sm text-slate-200 font-medium truncate">{profile.groupId}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
