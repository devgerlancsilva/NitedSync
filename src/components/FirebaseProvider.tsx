/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { UserRole, UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  allUsers: UserProfile[];
  refreshUsers: () => Promise<void>;
  createUser: (data: Omit<UserProfile, 'uid'> & { password?: string }) => Promise<void>;
  updateUser: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  deleteUser: (uid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  authError: null,
  login: async () => {},
  logout: async () => {},
  allUsers: [],
  refreshUsers: async () => {},
  createUser: async () => {},
  updateUser: async () => {},
  deleteUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// ─── Seed users ──────────────────────────────────────────────────────────────
const SEED_USERS: Array<{ email: string; password: string; profile: Omit<UserProfile, 'uid'> }> = [
  {
    email: 'teste@nitedsync.com',
    password: 'teste123',
    profile: { name: 'Usuário Teste (Admin)', email: 'teste@nitedsync.com', role: 'admin', sector: 'Diretoria', groupId: 'diretoria' },
  },
  {
    email: 'supervisor@nitedsync.com',
    password: 'supervisor123',
    profile: { name: 'Marina Souza (Supervisora)', email: 'supervisor@nitedsync.com', role: 'supervisor', sector: 'Desenvolvimento', groupId: 'dev' },
  },
  {
    email: 'colaborador@nitedsync.com',
    password: 'colaborador123',
    profile: { name: 'Ana Melo (Colaboradora)', email: 'colaborador@nitedsync.com', role: 'colaborador', sector: 'Design', groupId: 'design' },
  },
];

/**
 * Creates a Firebase Auth user via the REST API (Identity Toolkit).
 * This does NOT sign in as the new user — the current session is preserved.
 * Returns the new user's UID, or null if the user already exists.
 */
async function createUserViaRest(email: string, password: string): Promise<string | null> {
  try {
    const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
      }
    );
    if (!res.ok) return null; // e.g. EMAIL_EXISTS → ignore
    const data = await res.json();
    return data.localId as string;
  } catch {
    return null;
  }
}

async function seedAllTestUsers() {
  for (const seedUser of SEED_USERS) {
    const uid = await createUserViaRest(seedUser.email, seedUser.password);
    if (uid) {
      // New user created — write their Firestore profile
      try {
        await setDoc(doc(db, 'profiles', uid), { uid, ...seedUser.profile });
      } catch { /* ignore */ }
    }
    // If uid is null the user already exists — skip
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────
export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // ── Auth listener ──────────────────────────────────────────────────────────
  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        try {
          const snap = await getDoc(doc(db, 'profiles', fbUser.uid));
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            // New user with no profile yet — create a default colaborador profile
            const defaultProfile: UserProfile = {
              uid: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
              email: fbUser.email || '',
              role: 'colaborador',
              sector: 'Geral',
              groupId: 'geral',
            };
            await setDoc(doc(db, 'profiles', fbUser.uid), defaultProfile);
            setProfile(defaultProfile);
          }
        } catch (e) {
          console.error('Erro ao carregar perfil:', e);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load all users when authenticated
  useEffect(() => {
    if (profile) refreshUsers();
  }, [profile?.uid]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    setAuthError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      const msg = firebaseAuthError(e.code);
      setAuthError(msg);
      setLoading(false);
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setUser(null);
    setAllUsers([]);
  };

  // ── Users CRUD ─────────────────────────────────────────────────────────────
  const refreshUsers = async () => {
    try {
      const q = query(collection(db, 'profiles'), orderBy('name'));
      const snap = await getDocs(q);
      setAllUsers(snap.docs.map(d => d.data() as UserProfile));
    } catch {
      console.warn('Não foi possível carregar usuários');
    }
  };

  const createUser = async (data: Omit<UserProfile, 'uid'> & { password?: string }) => {
    const password = data.password || 'nited@2025';
    const { password: _p, ...profileData } = data as any;
    try {
      const newUid = await createUserViaRest(data.email, password);
      
      if (!newUid) {
        throw new Error('Não foi possível criar o usuário. E-mail já pode estar em uso ou a API falhou.');
      }
      
      const newProfile: UserProfile = { uid: newUid, ...profileData };
      await setDoc(doc(db, 'profiles', newUid), newProfile);
      setAllUsers(prev => [...prev, newProfile]);
    } catch (e: any) {
      throw new Error(e.message || firebaseAuthError(e.code));
    }
  };

  const updateUser = async (uid: string, data: Partial<UserProfile>) => {
    await setDoc(doc(db, 'profiles', uid), data, { merge: true });
    setAllUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...data } : u));
    if (profile?.uid === uid) setProfile(prev => prev ? { ...prev, ...data } : prev);
  };

  const deleteUser = async (uid: string) => {
    await deleteDoc(doc(db, 'profiles', uid));
    setAllUsers(prev => prev.filter(u => u.uid !== uid));
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading, authError,
      login, logout,
      allUsers, refreshUsers, createUser, updateUser, deleteUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Helpers ────────────────────────────────────────────────────────────────
function firebaseAuthError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'E-mail ou senha incorretos.';
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado.';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    default:
      return 'Erro ao fazer login. Verifique suas credenciais.';
  }
}
