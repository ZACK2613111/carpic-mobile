// Persisted upload queue (outbox pattern) — the offline-first backbone.
//
// Captured work is stashed as a durable local file + a queued task, then a
// drain loop pushes tasks to their registered handler (upload + DB write) with
// exponential backoff. Losing network mid-capture can no longer lose photos:
// the task simply stays queued until connectivity returns.
//
// This module is pure logic with injected side effects (storage, filesystem,
// timers) so it can be unit-tested without native modules. The app wires the
// real dependencies in `src/lib/uploadQueue/index.ts`.

export type UploadTask = {
  id: string;
  /** Handler routing key, e.g. 'shot' | 'spin-frame'. */
  kind: string;
  projectId: string;
  /** Dedupe key — one live task per target (retaking a photo replaces the old task). */
  key: string;
  /** File name inside the outbox directory (relative — survives container moves). */
  fileName: string;
  contentType: string;
  /** Kind-specific data the handler needs (slot, section, frame index…). */
  payload: Record<string, unknown>;
  attempts: number;
  createdAt: number;
};

/** Receives the task and the resolved absolute URI of its outbox file. */
export type UploadHandler = (task: UploadTask, fileUri: string) => Promise<void>;

export type UploadQueueDeps = {
  loadState: () => Promise<UploadTask[] | null>;
  saveState: (tasks: UploadTask[]) => Promise<void>;
  /** Copy the (volatile) source file into the outbox; returns the outbox file name. */
  stashFile: (sourceUri: string, taskId: string) => Promise<string>;
  removeFile: (fileName: string) => Promise<void>;
  pathFor: (fileName: string) => string;
  newId: () => string;
  now: () => number;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
  random?: () => number;
};

export type EnqueueInput = {
  kind: string;
  projectId: string;
  key: string;
  sourceUri: string;
  contentType: string;
  payload: Record<string, unknown>;
};

const MAX_BACKOFF_MS = 5 * 60_000;

export function createUploadQueue(deps: UploadQueueDeps) {
  let tasks: UploadTask[] = [];
  const handlers = new Map<string, UploadHandler>();
  const listeners = new Set<() => void>();
  let drainPromise: Promise<void> | null = null;
  let retryHandle: unknown = null;
  let initPromise: Promise<void> | null = null;

  const notify = () => listeners.forEach((l) => l());
  const persist = () => void deps.saveState(tasks).catch(() => {});

  function setTasks(next: UploadTask[]) {
    tasks = next;
    persist();
    notify();
  }

  /** Load persisted tasks (older first) and try to flush them. Idempotent. */
  function init(): Promise<void> {
    if (!initPromise) {
      initPromise = (async () => {
        const stored = await deps.loadState().catch(() => null);
        if (stored?.length) {
          // Tasks enqueued before init resolved stay after the restored ones (FIFO).
          setTasks([...stored, ...tasks]);
        }
        void drain();
      })();
    }
    return initPromise;
  }

  function registerHandler(kind: string, handler: UploadHandler): void {
    handlers.set(kind, handler);
  }

  async function enqueue(input: EnqueueInput): Promise<UploadTask> {
    const id = deps.newId();
    const fileName = await deps.stashFile(input.sourceUri, id);
    const replaced = tasks.find((t) => t.key === input.key);
    if (replaced) void deps.removeFile(replaced.fileName).catch(() => {});
    const task: UploadTask = {
      id,
      kind: input.kind,
      projectId: input.projectId,
      key: input.key,
      fileName,
      contentType: input.contentType,
      payload: input.payload,
      attempts: 0,
      createdAt: deps.now(),
    };
    setTasks([...tasks.filter((t) => t.key !== input.key), task]);
    void drain();
    return task;
  }

  /** Push every queued task through its handler; reschedules itself on failure. */
  function drain(): Promise<void> {
    if (drainPromise) return drainPromise;
    if (retryHandle != null) {
      deps.clearTimer(retryHandle);
      retryHandle = null;
    }
    drainPromise = (async () => {
      const skipped = new Set<string>();
      // Re-read `tasks` every iteration: tasks enqueued mid-drain are picked up too.
      for (;;) {
        const next = tasks.find((t) => !skipped.has(t.id));
        if (!next) break;
        const handler = handlers.get(next.kind);
        if (!handler) {
          skipped.add(next.id); // handler not registered (yet) — keep the task
          continue;
        }
        try {
          await handler(next, deps.pathFor(next.fileName));
          void deps.removeFile(next.fileName).catch(() => {});
          setTasks(tasks.filter((t) => t.id !== next.id));
        } catch {
          skipped.add(next.id);
          setTasks(tasks.map((t) => (t.id === next.id ? { ...t, attempts: t.attempts + 1 } : t)));
        }
      }
      if (skipped.size > 0 && tasks.length > 0) scheduleRetry();
    })().finally(() => {
      drainPromise = null;
    });
    return drainPromise;
  }

  function scheduleRetry(): void {
    if (retryHandle != null || tasks.length === 0) return;
    const minAttempts = tasks.reduce((m, t) => Math.min(m, t.attempts), Number.POSITIVE_INFINITY);
    const base = Math.min(1000 * 2 ** Math.min(minAttempts, 8), MAX_BACKOFF_MS);
    const jitter = (deps.random?.() ?? Math.random()) * 0.3 * base;
    retryHandle = deps.setTimer(() => {
      retryHandle = null;
      void drain();
    }, base + jitter);
  }

  /** Stable snapshot (same reference until the queue changes) — safe for useSyncExternalStore. */
  function getPending(): UploadTask[] {
    return tasks;
  }

  function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  return { init, registerHandler, enqueue, drain, getPending, subscribe };
}

export type UploadQueue = ReturnType<typeof createUploadQueue>;
