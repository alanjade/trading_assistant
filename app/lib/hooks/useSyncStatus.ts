'use client';

import { useEffect, useState } from 'react';
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from '@/lib/syncEngine';

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(() => ({
    ...getSyncStatus(),
    online: true,
  }));

  useEffect(() => {
    setStatus(getSyncStatus());
    return subscribeSyncStatus(setStatus);
  }, []);

  return status;
}
