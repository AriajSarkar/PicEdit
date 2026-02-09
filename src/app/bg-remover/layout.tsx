import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Background Remover",
  description:
    "Remove backgrounds from images instantly with AI. Free, no watermarks, 100% private. Works offline after first load.",
  openGraph: {
    title: "AI Background Remover - PicEdit",
    description:
      "Remove backgrounds from images instantly with AI. Free, no watermarks, 100% private.",
  },
  twitter: {
    title: "AI Background Remover - PicEdit",
    description:
      "Remove backgrounds from images instantly with AI. Free, no watermarks, 100% private.",
  },
};

export default function BGRemoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
