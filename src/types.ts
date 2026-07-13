/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ActivityStatus = 'backlog' | 'em_execucao' | 'em_revisao' | 'finalizado';
export type ActivityPriority = 'baixa' | 'media' | 'alta';
export type UserRole = 'admin' | 'supervisor' | 'colaborador';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  groupId: string; // ID do grupo — supervisor e seus colaboradores compartilham o mesmo groupId
}

export interface DailyEntry {
  id?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  groupId: string;
  description: string;       // descrição da ação feita no dia
  date: string;              // YYYY-MM-DD
  linkedActivityId: string | null;    // ID do card Kanban relacionado (opcional)
  linkedActivityTitle: string | null; // Título do card para exibição
  createdAt: any;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
}

export type NotificationType = 'atribuicao' | 'prazo_proximo' | 'mensagem';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  activityId: string;
  read: boolean;
  createdAt: any;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  category: string | null;
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assignees: Array<{ uid: string; name: string }>;
  collaborators: Array<{ uid: string; name: string }>;
  groupId: string | null;    // grupo responsável pela atividade
  sprintId?: string | null;  // sprint da atividade
  checklist?: Array<{ id: string; text: string; completed: boolean }>;
  comments?: Comment[];
  createdBy: string;
  creatorName: string;
  createdAt: any;
  updatedAt: any;
}

export interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}
