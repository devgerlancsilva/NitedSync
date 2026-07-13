/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_DOC = doc(db, 'settings', 'system');

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface SystemSettings {
  groups: Group[];
  sectors: string[];
  sprints: Sprint[];
  categories: string[];
}

const DEFAULT_SETTINGS: SystemSettings = {
  groups: [
    { id: 'diretoria', name: 'Diretoria' },
    { id: 'dev', name: 'Desenvolvimento' },
    { id: 'design', name: 'Design' },
    { id: 'financeiro', name: 'Financeiro' },
    { id: 'operacional', name: 'Operacional' },
    { id: 'marketing', name: 'Marketing' }
  ],
  sectors: ['Diretoria', 'Desenvolvimento', 'Design', 'Financeiro', 'Operacional', 'Marketing'],
  sprints: [],
  categories: ['Design', 'Desenvolvimento', 'Financeiro', 'Operacional', 'Marketing', 'Outros']
};

export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(SETTINGS_DOC, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSettings({
          groups: data.groups || DEFAULT_SETTINGS.groups,
          sectors: data.sectors || DEFAULT_SETTINGS.sectors,
          sprints: data.sprints || DEFAULT_SETTINGS.sprints,
          categories: data.categories || data.list || DEFAULT_SETTINGS.categories, // migrate old list
        });
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const saveSettings = async (newSettings: SystemSettings) => {
    await setDoc(SETTINGS_DOC, newSettings);
  };

  return { settings, loading, saveSettings };
}
