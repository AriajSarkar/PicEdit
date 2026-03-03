// ═══════════════════════════════════════════════════════════════════
// PicEdit — Generic Worker Pool Bridge
//
// Provides a reusable, message-ID based concurrency-safe worker pool.
// Both the compression and resize bridges instantiate this class with
// feature-specific configuration.
// ═══════════════════════════════════════════════════════════════════

// ── Types ───────────────────────────────────────────────────────────────────

export interface WorkerPoolConfig<TResult> {
	/** Factory function to create a new Worker instance */
	workerFactory: () => Worker;
	/** WASM JS loader URL (relative to origin + basePath) */
	wasmJsPath: string;
	/** WASM binary URL (relative to origin + basePath) */
	wasmBgPath: string;
	/** Message type string sent to the worker (e.g. 'compress', 'resize') */
	messageType: string;
	/** Transform raw worker result data into the typed result */
	transformResult: (data: Record<string, unknown>) => TResult;
	/** Optional per-request timeout in milliseconds (0 = no timeout) */
	requestTimeoutMs?: number;
	/** Optional extra payload fields to include in the init message */
	extraInitPayload?: Record<string, unknown>;
}

interface PendingOp<TResult> {
	resolve: (result: TResult) => void;
	reject: (err: Error) => void;
	onProgress?: (stage: string, percent: number) => void;
	slot: WorkerSlot;
	timer: ReturnType<typeof setTimeout> | null;
}

interface WorkerSlot {
	worker: Worker;
	busy: number;
}

// ── Pool size helper ────────────────────────────────────────────────────────

function getPoolSize(): number {
	const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency ?? 4) : 4;
	return Math.min(Math.max(cores, 2), 4); // 2–4 workers
}

function getBasePath(): string {
	return process.env.NEXT_PUBLIC_BASE_PATH || '';
}

// ── Generic Worker Pool Bridge ──────────────────────────────────────────────

export class WorkerPoolBridge<TResult> {
	private pool: WorkerSlot[] = [];
	private initPromise: Promise<boolean> | null = null;
	private nextId = 0;
	private readonly pending = new Map<number, PendingOp<TResult>>();
	private readonly config: WorkerPoolConfig<TResult>;

	constructor(config: WorkerPoolConfig<TResult>) {
		this.config = config;
	}

	// ── Internal helpers ──────────────────────────────────────────────────

	private rejectAllPending(reason: string) {
		for (const [id, op] of this.pending) {
			if (op.timer) clearTimeout(op.timer);
			op.reject(new Error(reason));
			this.pending.delete(id);
		}
	}

	private rejectPendingForSlot(slot: WorkerSlot, reason: string) {
		for (const [id, op] of this.pending) {
			if (op.slot === slot) {
				if (op.timer) clearTimeout(op.timer);
				op.reject(new Error(reason));
				this.pending.delete(id);
			}
		}
	}

	private createHandler(slot: WorkerSlot) {
		return (e: MessageEvent) => {
			const data = e.data;

			// Init responses (no ID) — handled by initWorker
			if (data.type === 'ready' || data.type === 'init-error') return;

			// Progress — route to caller
			if (data.type === 'progress' && data.id !== undefined) {
				const op = this.pending.get(data.id);
				op?.onProgress?.(data.stage, data.percent);
				return;
			}

			// Result — resolve and free slot
			if (data.type === 'result' && data.id !== undefined) {
				const op = this.pending.get(data.id);
				if (op) {
					if (op.timer) clearTimeout(op.timer);
					this.pending.delete(data.id);
					slot.busy--;
					try {
						const result = this.config.transformResult(data.result);
						op.resolve(result);
					} catch (err) {
						op.reject(err instanceof Error ? err : new Error(String(err)));
					}
				}
				return;
			}

			// Error — reject and free slot
			if (data.type === 'error' && data.id !== undefined) {
				const op = this.pending.get(data.id);
				if (op) {
					if (op.timer) clearTimeout(op.timer);
					this.pending.delete(data.id);
					slot.busy--;
					op.reject(new Error(data.message || 'Worker operation failed'));
				}
				return;
			}
		};
	}

	// ── Init ──────────────────────────────────────────────────────────────

	private initWorker(): Promise<WorkerSlot> {
		return new Promise<WorkerSlot>((resolve, reject) => {
			try {
				const w = this.config.workerFactory();
				const slot: WorkerSlot = { worker: w, busy: 0 };

				const basePath = getBasePath();
				const origin = typeof window !== 'undefined' ? window.location.origin : '';
				const wasmJsUrl = `${origin}${basePath}${this.config.wasmJsPath}`;
				const wasmBgUrl = `${origin}${basePath}${this.config.wasmBgPath}`;

				let settled = false;
				const cleanupInitListeners = () => {
					w.removeEventListener('message', onInit);
					clearTimeout(initTimeout);
				};

				const onInit = (e: MessageEvent) => {
					if (e.data.type !== 'ready' || settled) return;
					settled = true;
					cleanupInitListeners();
					w.onmessage = this.createHandler(slot);
					w.onerror = () => {
						w.terminate();
						const idx = this.pool.indexOf(slot);
						if (idx >= 0) this.pool.splice(idx, 1);
						this.rejectPendingForSlot(slot, 'Worker crashed');
					};
					resolve(slot);
				};

				const initTimeout = setTimeout(() => {
					if (settled) return;
					settled = true;
					cleanupInitListeners();
					w.terminate();
					this.rejectPendingForSlot(slot, 'Worker init timed out');
					reject(new Error('Worker init timed out'));
				}, 10000);

				w.onerror = () => {
					if (settled) return;
					settled = true;
					cleanupInitListeners();
					w.terminate();
					this.rejectPendingForSlot(slot, 'Worker init failed');
					reject(new Error('Worker init failed'));
				};

				w.addEventListener('message', onInit);
				w.postMessage({
					type: 'init',
					wasmJsUrl,
					wasmBgUrl,
					...this.config.extraInitPayload,
				});
			} catch (err) {
				reject(err);
			}
		});
	}

	/**
	 * Initialize the worker pool.
	 * Safe to call multiple times — returns cached promise.
	 */
	async init(): Promise<boolean> {
		if (this.initPromise) return this.initPromise;

		this.initPromise = (async () => {
			try {
				const size = getPoolSize();
				const results = await Promise.allSettled(
					Array.from({ length: size }, () => this.initWorker()),
				);
				const fulfilled = results
					.filter(
						(r): r is PromiseFulfilledResult<WorkerSlot> => r.status === 'fulfilled',
					)
					.map((r) => r.value);
				const rejected = results.filter((r) => r.status === 'rejected');
				if (rejected.length > 0) {
					console.warn(
						`[worker-pool] ${rejected.length}/${size} worker(s) failed to init`,
					);
				}
				if (fulfilled.length === 0) {
					console.warn('[worker-pool] All workers failed to init');
					this.initPromise = null;
					return false;
				}
				this.pool = fulfilled;
				console.log(`[worker-pool] Pool ready — ${this.pool.length}/${size} workers`);
				return true;
			} catch (err) {
				console.warn('[worker-pool] Pool init failed:', err);
				this.initPromise = null;
				return false;
			}
		})();

		return this.initPromise;
	}

	// ── Pick least-busy worker ────────────────────────────────────────────

	private pickWorker(): WorkerSlot | null {
		if (this.pool.length === 0) return null;
		let best = this.pool[0];
		for (let i = 1; i < this.pool.length; i++) {
			if (this.pool[i].busy < best.busy) best = this.pool[i];
		}
		return best;
	}

	// ── Execute ───────────────────────────────────────────────────────────

	/**
	 * Execute an operation in a worker.
	 * Returns null if no workers are available (caller should fall back).
	 */
	async execute(
		payload: Record<string, unknown>,
		onProgress?: (stage: string, percent: number) => void,
	): Promise<TResult | null> {
		// Ensure workers are initialized
		if (this.initPromise) {
			await this.initPromise;
		} else {
			await this.init();
		}

		const slot = this.pickWorker();
		if (!slot) return null;

		return new Promise<TResult>((resolve, reject) => {
			const id = ++this.nextId;
			slot.busy++;

			let timer: ReturnType<typeof setTimeout> | null = null;
			if (this.config.requestTimeoutMs && this.config.requestTimeoutMs > 0) {
				timer = setTimeout(() => {
					const entry = this.pending.get(id);
					if (entry) {
						this.pending.delete(id);
						entry.slot.busy--;
						reject(
							new Error(`Request timed out after ${this.config.requestTimeoutMs}ms`),
						);
					}
				}, this.config.requestTimeoutMs);
			}

			this.pending.set(id, { resolve, reject, onProgress, slot, timer });
			slot.worker.postMessage({
				type: this.config.messageType,
				id,
				...payload,
			});
		});
	}

	// ── Terminate ─────────────────────────────────────────────────────────

	/** Terminate all workers and reset state. */
	terminate(): void {
		this.pool.forEach((s) => s.worker.terminate());
		this.pool = [];
		this.initPromise = null;
		this.rejectAllPending('Workers terminated');
	}
}
