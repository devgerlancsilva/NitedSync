"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFixAdmin = exports.fixAdmin = exports.logActivityOnFinish = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
/**
 * Automação: Gera um registro no painel Daily automaticamente
 * quando um card do Kanban (Story) for movido para "Finalizado".
 */
exports.logActivityOnFinish = (0, firestore_1.onDocumentUpdated)("activities/{activityId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const beforeData = snapshot.before.data();
    const afterData = snapshot.after.data();
    // Verifica se o status mudou para 'Finalizado'
    if (beforeData.status !== 'Finalizado' && afterData.status === 'Finalizado') {
        const activityId = event.params.activityId;
        const title = afterData.title;
        const assignees = afterData.assignees || [];
        // Se não há responsáveis, não temos pra quem gerar o Daily
        if (assignees.length === 0)
            return;
        // Para cada usuário responsável pelo card, gerar um Daily Entry
        const promises = assignees.map(async (userId) => {
            var _a;
            // Buscar o nome do usuário para compor o registro
            const userDoc = await db.collection('profiles').doc(userId).get();
            const userName = userDoc.exists ? (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.name : 'Usuário Desconhecido';
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
exports.fixAdmin = (0, firestore_1.onDocumentUpdated)("dummy/{id}", async () => {
    // Not used directly, but can be invoked in shell
});
const runFixAdmin = async () => {
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
exports.runFixAdmin = runFixAdmin;
//# sourceMappingURL=index.js.map