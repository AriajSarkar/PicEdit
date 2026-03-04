/**
 * Landing page static data arrays.
 *
 * Extracted from app/page.tsx so the page component stays small.
 */
import type { ReactNode } from 'react';

// ── Tool definitions ────────────────────────────────────────────────────────

export interface ToolDef {
	name: string;
	description: string;
	href: string;
	badge: string;
	gradient: string;
	iconBg: string;
	icon: ReactNode;
}

export const TOOLS: ToolDef[] = [
	{
		name: 'Background Remover',
		description: 'AI-powered background removal. Upload, process, download — 3 taps.',
		href: '/bg-remover',
		badge: 'Ready',
		gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
		iconBg: 'bg-violet-500/10',
		icon: (
			<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
		),
	},
	{
		name: 'Image Compressor',
		description: 'WASM-powered compression. Visually lossless at a fraction of the file size.',
		href: '/img-compressor',
		badge: 'Ready',
		gradient: 'from-amber-500 via-orange-500 to-rose-500',
		iconBg: 'bg-amber-500/10',
		icon: (
			<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
				/>
			</svg>
		),
	},
	{
		name: 'Image Resizer',
		description: 'Resize to any dimension. Social media presets, custom sizes, batch support.',
		href: '/img-resizer',
		badge: 'Ready',
		gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
		iconBg: 'bg-cyan-500/10',
		icon: (
			<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
				/>
			</svg>
		),
	},
	{
		name: 'Format Converter',
		description: 'Convert between JPEG, PNG, WebP, AVIF, BMP, TIFF, ICO, and PDF. Rust WASM encoding. Batch supported.',
		href: '/img-converter',
		badge: 'Ready',
		gradient: 'from-emerald-500 via-green-500 to-teal-500',
		iconBg: 'bg-emerald-500/10',
		icon: (
			<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
				/>
			</svg>
		),
	},
	{
		name: 'AI Image Upscaler',
		description: 'Enhance resolution with AI super-resolution. 2× and 4× upscale, powered by Swin2SR — 100% client-side.',
		href: '/img-upscaler',
		badge: 'AI',
		gradient: 'from-pink-500 via-rose-500 to-red-500',
		iconBg: 'bg-pink-500/10',
		icon: (
			<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
				/>
			</svg>
		),
	},
];

// ── Feature definitions ─────────────────────────────────────────────────────

export interface FeatureDef {
	title: string;
	description: string;
	icon: ReactNode;
}

export const FEATURES: FeatureDef[] = [
	{
		title: '100% Private',
		description: 'Your images never leave your device. No server uploads, no tracking.',
		icon: (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
				/>
			</svg>
		),
	},
	{
		title: 'Blazing Fast',
		description: 'WebGPU + WASM acceleration. Rust algorithms at near-native speed.',
		icon: (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M13 10V3L4 14h7v7l9-11h-7z"
				/>
			</svg>
		),
	},
	{
		title: 'Free Forever',
		description: 'No sign-up, no limits, no watermarks. Premium quality, zero cost.',
		icon: (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
		),
	},
	{
		title: 'Multi-Processing',
		description: 'Chrome-like process isolation. Batch process in parallel.',
		icon: (
			<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
		),
	},
];

// ── Comparison table data ───────────────────────────────────────────────────

export interface ComparisonRow {
	feature: string;
	picedit: boolean | string;
	removebg: boolean | string;
	tinypng: boolean | string;
	iloveimg: boolean | string;
}

export const COMPARISON: ComparisonRow[] = [
	{
		feature: 'Background Removal',
		picedit: true,
		removebg: true,
		tinypng: false,
		iloveimg: false,
	},
	{
		feature: 'Image Compression',
		picedit: true,
		removebg: false,
		tinypng: true,
		iloveimg: true,
	},
	{
		feature: 'AI Upscaling',
		picedit: true,
		removebg: false,
		tinypng: false,
		iloveimg: false,
	},
	{
		feature: 'Batch Processing',
		picedit: true,
		removebg: 'Paid',
		tinypng: 'Paid',
		iloveimg: 'Limited',
	},
	{ feature: 'No Watermarks', picedit: true, removebg: 'Paid', tinypng: true, iloveimg: true },
	{
		feature: 'Unlimited Usage',
		picedit: true,
		removebg: false,
		tinypng: false,
		iloveimg: false,
	},
	{
		feature: '100% Client-Side',
		picedit: true,
		removebg: false,
		tinypng: false,
		iloveimg: false,
	},
	{ feature: 'No Sign-up', picedit: true, removebg: false, tinypng: false, iloveimg: true },
	{
		feature: 'Price',
		picedit: 'Free',
		removebg: '$5.99/mo',
		tinypng: '$25/yr',
		iloveimg: '$6/mo',
	},
];
