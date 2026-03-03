// ═══════════════════════════════════════════════════════════════════
// Worker Pool Types
// ═══════════════════════════════════════════════════════════════════

export type TaskStatus = 'queued' | 'processing' | 'complete' | 'error';

export interface WorkerTask<T = unknown> {
	id: string;
	type: string;
	data: T;
	transferable?: Transferable[];
}

export interface WorkerResult<R = unknown> {
	id: string;
	result?: R;
	error?: string;
	progress?: number;
}

export interface PoolTaskInfo {
	id: string;
	status: TaskStatus;
	progress: number;
	startedAt?: number;
	completedAt?: number;
}
