import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Image Compressor — PicEdit',
  description:
    'Compress images up to 90% smaller with WASM-powered algorithms. JPEG, PNG, WebP. Batch processing. Free, private, no uploads.',
  openGraph: {
    title: 'Image Compressor — PicEdit',
    description:
      'Compress images up to 90% smaller with WASM-powered algorithms. Free, private, no uploads.',
  },
  twitter: {
    title: 'Image Compressor — PicEdit',
    description:
      'Compress images up to 90% smaller with WASM-powered algorithms. Free, private, no uploads.',
  },
};

export default function ImgCompressorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
