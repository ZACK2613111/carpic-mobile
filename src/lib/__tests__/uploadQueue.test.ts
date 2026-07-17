import { createUploadQueue, type UploadQueueDeps, type UploadTask } from '../uploadQueue/core';

function makeDeps() {
  const state: { saved: UploadTask[] | null } = { saved: null };
  const files = new Set<string>();
  const timers: { fn: () => void; ms: number }[] = [];
  let seq = 0;
  const deps: UploadQueueDeps = {
    loadState: async () => state.saved,
    saveState: async (tasks) => {
      state.saved = tasks;
    },
    stashFile: async (_sourceUri, taskId) => {
      const name = `${taskId}.jpg`;
      files.add(name);
      return name;
    },
    removeFile: async (name) => {
      files.delete(name);
    },
    pathFor: (name) => `outbox://${name}`,
    newId: () => `id-${++seq}`,
    now: () => 1_000 + seq,
    setTimer: (fn, ms) => {
      timers.push({ fn, ms });
      return timers.length - 1;
    },
    clearTimer: () => {},
    random: () => 0,
  };
  return { deps, state, files, timers };
}

const input = (key = 'shot:p1:front') => ({
  kind: 'shot',
  projectId: 'p1',
  key,
  sourceUri: 'file:///cache/photo.jpg',
  contentType: 'image/jpeg',
  payload: { slot: 'front' },
});

describe('uploadQueue core', () => {
  it('drains a queued task through its handler and cleans up', async () => {
    const { deps, state, files } = makeDeps();
    const q = createUploadQueue(deps);
    const seen: { task: UploadTask; uri: string }[] = [];
    q.registerHandler('shot', async (task, uri) => {
      seen.push({ task, uri });
    });

    await q.enqueue(input());
    await q.drain();

    expect(seen).toHaveLength(1);
    expect(seen[0].uri).toBe('outbox://id-1.jpg');
    expect(seen[0].task.payload).toEqual({ slot: 'front' });
    expect(q.getPending()).toHaveLength(0);
    expect(files.size).toBe(0); // outbox file deleted after success
    expect(state.saved).toEqual([]); // persisted state cleared
  });

  it('keeps a failed task, bumps attempts, and retries on the scheduled timer', async () => {
    const { deps, timers } = makeDeps();
    const q = createUploadQueue(deps);
    let calls = 0;
    q.registerHandler('shot', async () => {
      calls += 1;
      if (calls === 1) throw new Error('network down');
    });

    await q.enqueue(input());
    await q.drain();

    expect(q.getPending()).toHaveLength(1);
    expect(q.getPending()[0].attempts).toBe(1);
    expect(timers).toHaveLength(1); // retry scheduled with backoff

    timers[0].fn();
    await q.drain();

    expect(calls).toBe(2);
    expect(q.getPending()).toHaveLength(0);
  });

  it('replaces the queued task when the same key is enqueued again (retake)', async () => {
    const { deps, files } = makeDeps();
    const q = createUploadQueue(deps);
    // No handler registered — tasks stay queued so we can observe the replace.

    await q.enqueue(input());
    await q.enqueue(input());

    expect(q.getPending()).toHaveLength(1);
    expect(q.getPending()[0].fileName).toBe('id-2.jpg');
    expect(files.has('id-1.jpg')).toBe(false); // replaced file removed
    expect(files.has('id-2.jpg')).toBe(true);
  });

  it('restores persisted tasks on init and drains them', async () => {
    const { deps, state } = makeDeps();
    state.saved = [
      {
        id: 'old-1',
        kind: 'shot',
        projectId: 'p1',
        key: 'shot:p1:front',
        fileName: 'old-1.jpg',
        contentType: 'image/jpeg',
        payload: { slot: 'front' },
        attempts: 3,
        createdAt: 1,
      },
    ];
    const q = createUploadQueue(deps);
    const seen: string[] = [];
    q.registerHandler('shot', async (task) => {
      seen.push(task.id);
    });

    await q.init();
    await q.drain();

    expect(seen).toEqual(['old-1']);
    expect(q.getPending()).toHaveLength(0);
  });

  it('leaves tasks with no registered handler queued without looping', async () => {
    const { deps } = makeDeps();
    const q = createUploadQueue(deps);

    await q.enqueue({ ...input(), kind: 'mystery' });
    await q.drain();

    expect(q.getPending()).toHaveLength(1);
    expect(q.getPending()[0].attempts).toBe(0); // not counted as a failed attempt
  });

  it('notifies subscribers on every queue change', async () => {
    const { deps } = makeDeps();
    const q = createUploadQueue(deps);
    q.registerHandler('shot', async () => {});
    let notified = 0;
    const unsubscribe = q.subscribe(() => {
      notified += 1;
    });

    await q.enqueue(input());
    await q.drain();

    expect(notified).toBeGreaterThanOrEqual(2); // enqueue + completion
    unsubscribe();
  });
});
