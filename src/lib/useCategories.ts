/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const SETTINGS_DOC = doc(db, 'settings', 'categories');

const DEFAULT_CATEGORIES = [
  'Design',
  'Desenvolvimento',
  'Financeiro',
  'Operacional',
  'Marketing',
  'Outros',
];

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(SETTINGS_DOC, (snap) => {
      if (snap.exists() && snap.data().list?.length) {
        setCategories(snap.data().list as string[]);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const saveCategories = async (list: string[]) => {
    await setDoc(SETTINGS_DOC, { list });
  };

  return { categories, loading, saveCategories };
}
