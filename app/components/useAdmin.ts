"use client";
import { useEffect, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { useFirebase } from './FirebaseProvider';
export function useAdmin() {
  const { auth } = useFirebase();
  const [adminUid, setAdminUid] = useState<string | null>(null);
  useEffect(() => {
    if (!auth) return;
    return onIdTokenChanged(auth, user => {
      setAdminUid(null);
      user?.getIdTokenResult().then(result => {
        if (auth.currentUser?.uid === user.uid) setAdminUid(result.claims.admin === true ? user.uid : null);
      }).catch(() => setAdminUid(null));
    });
  }, [auth]);
  return !!adminUid && adminUid === auth?.currentUser?.uid;
}
