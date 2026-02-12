// ═══════════════════════════════════════════════════════════════════
// PicEdit — Chrome-like Worker Pool (Process Isolation)
//
// Mimics Chrome's process-per-tab model:
//   • Each image task gets its own Worker (process isolation)
//   • If one crashes, others continue unaffected
//   • Memory is isolated per worker
//   • Main thread stays responsive
//   • Automatic queuing when pool is full
// ═══════════════════════════════════════════════════════════════════

import type { WorkerTask, WorkerResult, PoolTaskInfo } from "@/types";
import type { TaskStatus } from "@/types";
export type { TaskStatus };

type ProgressCallback = (taskId: string, progress: number) => void;

interface QueuedTask<T, R> {
  task: WorkerTask<T>;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

export class WorkerPool<T = unknown, R = unknown> {
  private pool: Worker[] = [];
  private busy = new Set<Worker>();
  private queue: QueuedTask<T, R>[] = [];
  private maxWorkers: number;
  private workerFactory: () => Worker;
  private taskMap = new Map<string, PoolTaskInfo>();
  private onProgress?: ProgressCallback;

  constructor(
    workerFactory: () => Worker,
    options?: { maxWorkers?: number; onProgress?: ProgressCallback }
  ) {
    this.maxWorkers = options?.maxWorkers ?? Math.min(navigator.hardwareConcurrency || 4, 8);
    this.workerFactory = workerFactory;
    this.onProgress = options?.onProgress;
  }

  /** Get or create an available worker */
  private acquireWorker(): Worker | null {
    // Find an idle worker
    const idle = this.pool.find((w) => !this.busy.has(w));
    if (idle) {
      this.busy.add(idle);
      return idle;
    }
    // Create new if under limit
    if (this.pool.length < this.maxWorkers) {
      const worker = this.workerFactory();
      this.pool.push(worker);
      this.busy.add(worker);
      return worker;
    }
    return null;
  }

  /** Release a worker back to the pool */
  private releaseWorker(worker: Worker): void {
    this.busy.delete(worker);
    this.processQueue();
  }

  /** Try to process queued tasks */
  private processQueue(): void {
    while (this.queue.length > 0) {
      const worker = this.acquireWorker();
      if (!worker) break;
      const queued = this.queue.shift()!;
      this.executeOnWorker(worker, queued);
    }
  }

  /** Execute a task on a specific worker */
  private executeOnWorker(worker: Worker, queued: QueuedTask<T, R>): void {
    const { task, resolve, reject } = queued;

    this.taskMap.set(task.id, {
      id: task.id,
      status: "processing",
      progress: 0,
      startedAt: Date.now(),
    });

    const cleanup = () => {
      worker.onmessage = null;
      worker.onerror = null;
      this.releaseWorker(worker);
    };

    worker.onmessage = (e: MessageEvent<WorkerResult<R>>) => {
      const result = e.data;

      // Progress update (not final result)
      if (result.progress !== undefined && !result.result && !result.error) {
        const info = this.taskMap.get(task.id);
        if (info) info.progress = result.progress;
        this.onProgress?.(task.id, result.progress);
        return;
      }

      // Final result
      if (result.error) {
        this.taskMap.set(task.id, {
          id: task.id,
          status: "error",
          progress: 0,
          completedAt: Date.now(),
        });
        cleanup();
        reject(new Error(result.error));
      } else {
        this.taskMap.set(task.id, {
          id: task.id,
          status: "complete",
          progress: 100,
          completedAt: Date.now(),
        });
        cleanup();
        resolve(result.result as R);
      }
    };

    worker.onerror = (err) => {
      this.taskMap.set(task.id, {
        id: task.id,
        status: "error",
        progress: 0,
        completedAt: Date.now(),
      });
      cleanup();
      // Terminate crashed worker and remove from pool (process isolation)
      worker.terminate();
      this.pool = this.pool.filter((w) => w !== worker);
      reject(new Error(err.message || "Worker crashed"));
    };

    // Send task with transferable buffers (zero-copy)
    worker.postMessage(
      { id: task.id, type: task.type, data: task.data },
      task.transferable || []
    );
  }

  /** Execute a single task */
  async execute(task: WorkerTask<T>): Promise<R> {
    this.taskMap.set(task.id, {
      id: task.id,
      status: "queued",
      progress: 0,
    });

    return new Promise<R>((resolve, reject) => {
      const worker = this.acquireWorker();
      if (worker) {
        this.executeOnWorker(worker, { task, resolve, reject });
      } else {
        this.queue.push({ task, resolve, reject });
      }
    });
  }

  /** Execute a batch of tasks in parallel (up to maxWorkers concurrent) */
  async executeBatch(tasks: WorkerTask<T>[]): Promise<R[]> {
    return Promise.all(tasks.map((t) => this.execute(t)));
  }

  /** Get current status of a task */
  getTaskStatus(taskId: string): PoolTaskInfo | undefined {
    return this.taskMap.get(taskId);
  }

  /** Get all active task statuses */
  getAllTasks(): PoolTaskInfo[] {
    return Array.from(this.taskMap.values());
  }

  /** Number of workers currently busy */
  get activeCount(): number {
    return this.busy.size;
  }

  /** Number of tasks waiting in queue */
  get queueLength(): number {
    return this.queue.length;
  }

  /** Total number of workers in pool */
  get poolSize(): number {
    return this.pool.length;
  }

  /** Terminate all workers and clear state */
  terminate(): void {
    this.pool.forEach((w) => w.terminate());
    this.pool = [];
    this.busy.clear();
    this.queue = [];
    this.taskMap.clear();
  }
}
