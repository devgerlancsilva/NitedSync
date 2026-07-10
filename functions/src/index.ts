import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Automação: Gera um registro no painel Daily automaticamente
 * quando um card do Kanban (Story) for movido para "Finalizado".
 */
export const logActivityOnFinish = onDocumentUpdated("activities/{activityId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const beforeData = snapshot.before.data();
  const afterData = snapshot.after.data();

  // Verifica se o status mudou para 'Finalizado'
  if (beforeData.status !== 'Finalizado' && afterData.status === 'Finalizado') {
    const activityId = event.params.activityId;
    const title = afterData.title;
    const assignees = afterData.assignees || [];
    
    // Se não há responsáveis, não temos pra quem gerar o Daily
    if (assignees.length === 0) return;

    // Para cada usuário responsável pelo card, gerar um Daily Entry
    const promises = assignees.map(async (userId: string) => {
      // Buscar o nome do usuário para compor o registro
      const userDoc = await db.collection('profiles').doc(userId).get();
      const userName = userDoc.exists ? userDoc.data()?.name : 'Usuário Desconhecido';

      return db.collection('daily_entries').add({
        userId,
        userName,
        text: `Concluiu a tarefa: ${title}`,
        activityId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await Promise.all(promises);
    console.log(`✅ Registros Daily gerados para a tarefa ${activityId} (${title})`);
  }
});

// TEMPORARY FIX TO RESTORE ADMIN
export const fixAdmin = onDocumentUpdated("dummy/{id}", async () => {
  // Not used directly, but can be invoked in shell
});

export const runFixAdmin = async () => {
  const q = await db.collection('profiles').get();
  let count = 0;
  for (const d of q.docs) {
    const data = d.data();
    if (data.name.includes("Gêrlan") || data.email === "teste@nitedsync.com" || data.role !== 'admin') {
      await d.ref.update({ role: 'admin' });
      console.log(`Upgraded ${data.name} to admin`);
      count++;
    }
  }
  return `Upgraded ${count} users.`;
};
