import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Format Converter — PicEdit',
	description:
		'Convert images between JPEG, PNG, WebP, BMP, TIFF, ICO formats. Rust WASM-powered encoding. Batch processing. Free, private, no uploads.',
	openGraph: {
		title: 'Format Converter — PicEdit',
		description:
			'Convert images between JPEG, PNG, WebP, BMP, TIFF, ICO formats. Free, private, no uploads.',
	},
	twitter: {
		title: 'Format Converter — PicEdit',
		description:
			'Convert images between JPEG, PNG, WebP, BMP, TIFF, ICO formats. Free, private, no uploads.',
	},
};

export default function ImgConverterLayout({ children }: { children: React.ReactNode }) {
	return children;
}
