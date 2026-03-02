import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Image Resizer — PicEdit',
  description:
    'Resize images to any dimension. Social media presets for Instagram, Facebook, Twitter, YouTube & more. Batch processing. Free, private, no uploads.',
  openGraph: {
    title: 'Image Resizer — PicEdit',
    description:
      'Resize images to any dimension. Social media presets, batch processing. Free, private, no uploads.',
  },
  twitter: {
    title: 'Image Resizer — PicEdit',
    description:
      'Resize images to any dimension. Social media presets, batch processing. Free, private, no uploads.',
  },
};

export default function ImgResizerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
