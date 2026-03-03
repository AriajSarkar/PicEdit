// ═══════════════════════════════════════════════════════════════════
// Shared Image Types
// ═══════════════════════════════════════════════════════════════════

export type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export interface ImageInfo {
	fileName: string;
	fileSize: number;
	width: number;
	height: number;
	type: string;
}

export const DEFAULT_IMAGE_INFO: ImageInfo = {
	fileName: '',
	fileSize: 0,
	width: 0,
	height: 0,
	type: '',
};
