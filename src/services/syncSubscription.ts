import { onSnapshot, type FirestoreError, type Query, type QuerySnapshot } from 'firebase/firestore';

// The SDK recovers ordinary transport outages. Reattach only when a transient
// error terminates a listener; permission/configuration failures need correction.
export function subscribeWithRecovery(query: Query, callbacks: {
  next: (snapshot: QuerySnapshot) => void;
  error: (error: FirestoreError, retrying: boolean) => void;
}): () => void {
  let stopped = false;
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void) | undefined;
  const attach = () => {
    if (stopped) return;
    unsubscribe?.();
    unsubscribe = onSnapshot(query, { includeMetadataChanges: true }, snapshot => {
      if (stopped) return;
      if (!snapshot.metadata.fromCache) attempts = 0;
      callbacks.next(snapshot);
    }, error => {
      if (stopped) return;
      const retrying = ['unavailable', 'deadline-exceeded', 'aborted', 'internal', 'resource-exhausted'].includes(error.code);
      callbacks.error(error, retrying);
      if (retrying) timer = setTimeout(attach, Math.min(1000 * 2 ** attempts++, 30000));
    });
  };
  attach();
  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe?.();
  };
}
