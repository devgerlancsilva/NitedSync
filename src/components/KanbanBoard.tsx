/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Activity, ActivityStatus, ActivityPriority } from '../types';
import { cn } from '../lib/utils';
import { useAuth } from './FirebaseProvider';
import { useSettings } from '../lib/useSettings';
import { ActivityCard } from './ActivityCard';
import { NewActivityModal } from './NewActivityModal';
import { AnalyticsModal } from './AnalyticsModal';
import { NotificationDropdown } from './NotificationDropdown';
import { Plus, Layout, ListTodo, Play, CheckCircle2, Loader2, Search, BarChart3 } from 'lucide-react';
import { motion } from 'motion/react';
import { createNotification } from '../lib/notifications';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const COLUMNS: { id: ActivityStatus; title: string; icon: any; color: string; accent: string }[] = [
  { id: 'backlog',     title: 'Backlog',      icon: ListTodo,    color: 'text-rose-400',    accent: 'border-rose-500/20 bg-rose-500/5' },
  { id: 'em_execucao', title: 'Em Execução',  icon: Play,        color: 'text-amber-400',   accent: 'border-amber-500/20 bg-amber-500/5' },
  { id: 'em_revisao',  title: 'Em Revisão',   icon: Search,      color: 'text-indigo-400',  accent: 'border-indigo-500/20 bg-indigo-500/5' },
  { id: 'finalizado',  title: 'Finalizado',   icon: CheckCircle2, color: 'text-emerald-400', accent: 'border-emerald-500/20 bg-emerald-500/5' },
];

const DraggableAny = Draggable as any;

export const KanbanBoard: React.FC = () => {
  const { user, profile } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<ActivityPriority | 'todas'>('todas');
  const [categoryFilter, setCategoryFilter] = useState<string | 'todas'>('todas');
  const [sprintFilter, setSprintFilter] = useState<string | 'todas'>('todas');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const { settings } = useSettings();

  const isAdmin = profile?.role === 'admin';
  const isSupervisor = profile?.role === 'supervisor';
  const isColaborador = profile?.role === 'colaborador';

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'activities'), orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Activity));
      setActivities(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'activities');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as ActivityStatus;
    
    const updatedActivities = activities.map(a => 
      a.id === draggableId ? { ...a, status: newStatus } : a
    );
    setActivities(updatedActivities);

    try {
      await updateDoc(doc(db, 'activities', draggableId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `activities/${draggableId}`);
    }
  };

  const handleCreateOrUpdateActivity = async (
    title: string, description: string, priority: ActivityPriority,
    category: string | null, dueDate: string | null, sprintId: string | null,
    assignee: { id: string | null, name: string | null } | null,
    checklist: Array<{ id: string, text: string, completed: boolean }>
  ) => {
    if (!user) return;
    try {
      if (editingActivity) {
        await updateDoc(doc(db, 'activities', editingActivity.id), {
          title,
          description,
          priority,
          category,
          sprintId,
          dueDate,
          assigneeId: assignee?.id || null,
          assigneeName: assignee?.name || null,
          assignees: assignee?.id ? [{ uid: assignee.id, name: assignee.name! }] : [],
          checklist,
          updatedAt: serverTimestamp(),
        });

        if (assignee?.id && assignee.id !== user.uid && assignee.id !== editingActivity.assigneeId) {
          await createNotification(
            assignee.id,
            'Nova tarefa atribuída',
            `${profile?.name?.split(' ')[0] || 'Alguém'} atribuiu uma tarefa a você: ${title}`,
            'assignment',
            editingActivity.id
          );
        }
      } else {
        const docRef = await addDoc(collection(db, 'activities'), {
          title,
          description,
          status: 'backlog',
          priority,
          category,
          sprintId,
          dueDate,
          assigneeId: assignee?.id || null,
          assigneeName: assignee?.name || null,
          assignees: assignee?.id ? [{ uid: assignee.id, name: assignee.name! }] : [],
          collaborators: [],
          groupId: profile?.groupId || null,
          checklist,
          createdBy: user.uid,
          creatorName: profile?.name || user.displayName || user.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (assignee?.id && assignee.id !== user.uid) {
          await createNotification(
            assignee.id,
            'Nova tarefa atribuída',
            `${profile?.name || user.email} atribuiu a você: ${title}`,
            'atribuicao',
            docRef.id
          );
        }
      }
      setIsModalOpen(false);
      setEditingActivity(null);
    } catch (error) {
      handleFirestoreError(error, editingActivity ? OperationType.UPDATE : OperationType.CREATE, 'activities');
    }
  };

  const handleStatusChange = async (id: string, newStatus: ActivityStatus) => {
    try {
      await updateDoc(doc(db, 'activities', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `activities/${id}`);
    }
  };

  const handleAssignToMe = async (id: string) => {
    if (!user || !profile) return;
    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    const isAlreadyAssignee = activity.assignees?.some(a => a.uid === user.uid);
    if (isAlreadyAssignee) return;

    try {
      const newAssignees = [
        ...(activity.assignees || []),
        { uid: user.uid, name: profile.name || user.displayName || user.email || 'Usuário' }
      ];
      const newCollaborators = (activity.collaborators || []).filter(c => c.uid !== user.uid);

      await updateDoc(doc(db, 'activities', id), {
        assigneeId: newAssignees[0].uid,
        assigneeName: newAssignees[0].name,
        assignees: newAssignees,
        collaborators: newCollaborators,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `activities/${id}`);
    }
  };

  const handleJoinAsHelper = async (id: string) => {
    if (!user || !profile) return;
    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    const alreadyHelper = activity.collaborators?.some(c => c.uid === user.uid);
    const isAssignee = activity.assignees?.some(a => a.uid === user.uid) || activity.assigneeId === user.uid;
    if (alreadyHelper || isAssignee) return;

    try {
      await updateDoc(doc(db, 'activities', id), {
        collaborators: [
          ...(activity.collaborators || []),
          { uid: user.uid, name: profile.name || user.displayName || user.email }
        ],
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `activities/${id}`);
    }
  };
  const handleLeaveAsHelper = async (id: string) => {
    if (!user || !profile) return;
    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    try {
      const newCollaborators = (activity.collaborators || []).filter(c => c.uid !== user.uid);
      await updateDoc(doc(db, 'activities', id), {
        collaborators: newCollaborators,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `activities/${id}`);
    }
  };
  const handleToggleChecklistItem = async (activityId: string, itemId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity || !activity.checklist) return;

    const newChecklist = activity.checklist.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    try {
      await updateDoc(doc(db, 'activities', activityId), {
        checklist: newChecklist,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `activities/${activityId}`);
    }
  };

  const handleDeleteActivity = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `activities/${id}`);
    }
  };

  const handleUnassignMe = async (id: string) => {
    if (!user || !profile) return;
    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    try {
      const newAssignees = (activity.assignees || []).filter(a => a.uid !== user.uid);
      const newAssigneeId = newAssignees.length > 0 ? newAssignees[0].uid : null;
      const newAssigneeName = newAssignees.length > 0 ? newAssignees[0].name : null;

      await updateDoc(doc(db, 'activities', id), {
        assigneeId: newAssigneeId,
        assigneeName: newAssigneeName,
        assignees: newAssignees,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `activities/${id}`);
    }
  };

  // Admins see all, others see only their group
  const sectorActivities = isAdmin 
    ? activities 
    : activities.filter(a => a.groupId === profile?.groupId);

  const filteredActivities = sectorActivities.filter(activity => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      activity.title.toLowerCase().includes(searchLower) ||
      (activity.assigneeName && activity.assigneeName.toLowerCase().includes(searchLower)) ||
      activity.assignees?.some(a => a.name.toLowerCase().includes(searchLower)) ||
      activity.creatorName.toLowerCase().includes(searchLower)
    );
    const matchesPriority = priorityFilter === 'todas' || activity.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'todas' || activity.category === categoryFilter;
    const matchesSprint = sprintFilter === 'todas' 
      ? true 
      : sprintFilter === 'backlog' 
        ? !activity.sprintId 
        : activity.sprintId === sprintFilter;
    return matchesSearch && matchesPriority && matchesCategory && matchesSprint;
  });

  const stats = {
    total: sectorActivities.length,
    executing: sectorActivities.filter(a => a.status === 'em_execucao').length,
    finished: sectorActivities.filter(a => a.status === 'finalizado').length,
    delayed: sectorActivities.filter(a => a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'finalizado').length,
  };

  // All roles can create cards
  const canCreate = true;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium tracking-wide">Sincronizando fluxo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total de tarefas', value: stats.total, sub: `${stats.finished} finalizadas`, subColor: 'text-emerald-400' },
          { label: 'Em execução',     value: stats.executing, sub: `${stats.delayed} atrasadas`, subColor: 'text-amber-400' },
          { label: 'Finalizadas',     value: stats.finished, sub: 'concluídas', subColor: 'text-emerald-400' },
          { label: 'Atrasadas',       value: stats.delayed, sub: 'precisam atenção', subColor: 'text-rose-400' },
        ].map(m => (
          <div key={m.label} className="bg-surface-panel p-5 rounded-3xl border border-white/5 shadow-xl">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{m.label}</p>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-black text-white">{m.value}</span>
              <span className={cn("text-[10px] font-bold mb-1", m.subColor)}>{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 bg-surface-panel/30 p-5 rounded-3xl border border-white/[0.03] backdrop-blur-sm">
        <div className="flex-1 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por título, responsável ou criador..."
              className="w-full pl-12 pr-4 py-3 bg-surface-base/50 border border-white/5 rounded-2xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 transition-all"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Priority filter */}
          <div className="flex items-center gap-2 bg-surface-base/50 p-1.5 rounded-2xl border border-white/5 max-w-full overflow-x-auto scrollbar-none">
            <span className="px-2 shrink-0 text-[9px] font-black text-slate-600 uppercase tracking-widest border-r border-white/5">Prioridade</span>
            <div className="flex gap-1 shrink-0">
              {(['todas', 'alta', 'media', 'baixa'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                    priorityFilter === p ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  )}
                >
                  {p === 'todas' ? 'Todas' : p}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2 bg-surface-base/50 p-1.5 rounded-2xl border border-white/5 max-w-full overflow-x-auto scrollbar-none">
            <span className="px-2 shrink-0 text-[9px] font-black text-slate-600 uppercase tracking-widest border-r border-white/5">Categoria</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-slate-400 focus:outline-none px-2 cursor-pointer appearance-none"
            >
              <option value="todas" className="bg-surface-panel text-slate-200">Todas</option>
              {settings.categories.map(cat => (
                <option key={cat} value={cat} className="bg-surface-panel text-slate-200">{cat}</option>
              ))}
            </select>
          </div>

          {/* Sprint filter */}
          <div className="flex items-center gap-2 bg-surface-base/50 p-1.5 rounded-2xl border border-white/5 max-w-full overflow-x-auto scrollbar-none">
            <span className="px-2 shrink-0 text-[9px] font-black text-slate-600 uppercase tracking-widest border-r border-white/5">Sprint</span>
            <select
              value={sprintFilter}
              onChange={(e) => setSprintFilter(e.target.value)}
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-slate-400 focus:outline-none px-2 cursor-pointer appearance-none max-w-[150px] truncate"
            >
              <option value="todas" className="bg-surface-panel text-slate-200">Todas</option>
              <option value="backlog" className="bg-surface-panel text-slate-200">Sem Sprint</option>
              {settings.sprints.map(s => (
                <option key={s.id} value={s.id} className="bg-surface-panel text-slate-200">{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <button
              onClick={() => setIsAnalyticsOpen(true)}
              className="w-10 h-10 flex items-center justify-center bg-white/[0.03] hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 rounded-xl border border-white/5 transition-all"
              title="Analytics"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            {canCreate && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 h-10 rounded-xl font-bold shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Nova Atividade</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex overflow-x-auto lg:grid lg:grid-cols-4 gap-6 items-start pb-4 snap-x snap-mandatory custom-scrollbar">
          {COLUMNS.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div 
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={cn(
                    "flex flex-col min-h-[500px] rounded-3xl p-2 transition-colors border min-w-[85vw] md:min-w-[45vw] lg:min-w-0 shrink-0 snap-center",
                    snapshot.isDraggingOver ? column.accent : "border-transparent bg-white/[0.01]"
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <column.icon className={cn("w-4 h-4", column.color)} />
                      <h2 className="font-extrabold text-slate-200 text-xs uppercase tracking-widest">{column.title}</h2>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                      {filteredActivities.filter(a => a.status === column.id).length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 space-y-3 px-1 pb-3">
                    {filteredActivities
                      .filter(a => a.status === column.id)
                      .map((activity, index) => (
                        <DraggableAny key={activity.id} draggableId={activity.id} index={index}>
                          {(provided: any, snapshot: any) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(snapshot.isDragging && "z-50")}
                            >
                                <ActivityCard
                                  activity={activity}
                                  onStatusChange={handleStatusChange}
                                  onAssignToMe={handleAssignToMe}
                                  onJoinAsHelper={handleJoinAsHelper}
                                  onLeaveAsHelper={handleLeaveAsHelper}
                                  onUnassignMe={handleUnassignMe}
                                  onEdit={(a) => { setEditingActivity(a); setIsModalOpen(true); }}
                                  onToggleChecklistItem={handleToggleChecklistItem}
                                  onDelete={handleDeleteActivity}
                                />
                            </div>
                          )}
                        </DraggableAny>
                      ))}
                    {provided.placeholder}
                    
                    {/* Add card button — all roles */}
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-white/[0.04] rounded-2xl group/add hover:border-indigo-500/20 hover:bg-indigo-500/[0.02] transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-700 group-hover/add:text-indigo-400 transition-colors" />
                      <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest group-hover/add:text-indigo-400 transition-colors">
                        Adicionar
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <NewActivityModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingActivity(null); }}
        onSubmit={handleCreateOrUpdateActivity}
        initialData={editingActivity}
      />

      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        activities={activities}
      />
    </div>
  );
};
