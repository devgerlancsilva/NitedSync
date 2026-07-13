# NitedSync — Portal de Produtividade

O **NitedSync** é um sistema moderno de gerenciamento de tarefas e produtividade voltado para equipes. O aplicativo foi projetado com uma interface premium e responsiva, focada na usabilidade do dia a dia, para que diferentes perfis profissionais consigam alinhar e acompanhar as demandas de trabalho (micro e macro gerenciamento).

---

## 🚀 Funcionalidades Principais

* **Story (Kanban):** Painel visual para acompanhamento de tarefas nos status: *Backlog*, *Em Execução*, *Em Revisão* e *Finalizado*. Permite atribuir responsáveis, colaborar com outros membros e acompanhar prazos e checklists.
* **Daily:** Registro diário (microgerenciamento) onde os colaboradores informam suas ações e realizações do dia, podendo atrelar cada ação a uma tarefa específica do painel Story.
* **Relatórios:** Uma visão analítica com exportação para PDF, onde supervisores e admins podem filtrar as atividades do painel por período, status, categoria ou responsável.
* **Gestão de Usuários e Perfis:** Módulo de CRUD de colaboradores exclusivo para Administradores.

## 👥 Hierarquia e Acessos

O sistema possui controle de acesso rigoroso baseado em 3 perfis (*roles*):

1. **Administrador (Admin):** Possui acesso total ao sistema. Consegue gerenciar as atividades de toda a empresa, além de gerenciar colaboradores (adicionar/editar/remover) e administrar categorias.
2. **Supervisor:** Acesso focado no seu respectivo grupo/setor (ex: equipe de Design, Desenvolvimento). Pode visualizar as tarefas da sua equipe e atua como revisor antes das atividades serem finalizadas.
3. **Colaborador:** Focado na execução e rotina. Possui acesso ao Kanban (para assumir, ajudar e mover tarefas) e acesso para lançar suas atividades no painel *Daily*.

## 🛠️ Tecnologias Utilizadas

* **Frontend:** React + Vite, TypeScript
* **Estilização:** Tailwind CSS (Vanilla CSS com Design System moderno, cores vibrantes, glassmorphism e animações)
* **Animações:** `motion/react` (Framer Motion)
* **Ícones:** `lucide-react`
* **Backend as a Service:** Firebase (Authentication + Cloud Firestore)

---

## 💻 Como rodar o projeto localmente

### 1. Pré-requisitos
* [Node.js](https://nodejs.org/en/) (versão 18+ recomendada)
* Uma conta no Firebase.

### 2. Configurando o Firebase
Antes de iniciar, o projeto precisa ser conectado a um banco de dados:
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Ative o **Authentication** (habilite o provedor de Email/Senha).
3. Ative o **Firestore Database**.
4. Configure as [Regras de Segurança do Firestore](#regras-do-firestore) (Security Rules).
3. No arquivo `.env` (na raiz do projeto), preencha com as credenciais de conexão do seu projeto Firebase (use o arquivo `.env.example` como base).

### 3. Instalação e Execução

Clone o repositório e acesse a pasta do projeto, então execute:

```bash
# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse o aplicativo em `http://localhost:3000` (ou a porta informada pelo Vite).

---

## 🚀 Deploy no Vercel

O projeto já está configurado para ser hospedado gratuitamente no Vercel (incluindo o arquivo `vercel.json` para roteamento SPA).

1. Suba este código para um repositório no **GitHub**.
2. Crie uma conta/faça login no [Vercel](https://vercel.com).
3. Clique em **Add New Project** e importe o seu repositório do GitHub.
4. Antes de clicar em Deploy, expanda a aba **Environment Variables**.
5. Adicione as mesmas variáveis de ambiente que estão no seu arquivo `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
6. Clique em **Deploy**! Em instantes seu portal estará no ar.

---

## 🔐 Regras do Firestore
Para que o sistema funcione corretamente, seu banco de dados Firebase Firestore precisa permitir a leitura e escrita aos usuários autenticados. Recomendamos regras básicas iniciais como:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Permite o acesso apenas a usuários logados
      allow read, write: if request.auth != null;
    }
  }
}
```
*(Para um ambiente de produção real, certifique-se de restringir a escrita da collection `profiles` apenas a usuários com role de Admin).*

## 🧪 Contas Iniciais (Seed)
Ao rodar a aplicação localmente pela primeira vez, as seguintes contas padrão de teste são geradas automaticamente no seu Firebase Auth caso elas ainda não existam:

* **Admin:** `teste@nitedsync.com` / `teste123`
* **Supervisora:** `supervisor@nitedsync.com` / `supervisor123`
* **Colaboradora:** `colaborador@nitedsync.com` / `colaborador123`
