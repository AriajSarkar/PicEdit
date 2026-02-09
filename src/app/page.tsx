import Link from "next/link";

const TOOLS = [
  {
    name: "Background Remover",
    description: "Remove backgrounds from images using AI. Fast, accurate, and runs entirely in your browser.",
    href: "/bg-remover",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    badge: "Ready",
  },
  {
    name: "Image Compressor",
    description: "Compress images without losing quality. Supports PNG, JPG, and WebP formats.",
    href: "#",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    badge: "Coming Soon",
  },
  {
    name: "Image Resizer",
    description: "Resize images to any dimension. Perfect for social media, web, or print.",
    href: "#",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
    badge: "Coming Soon",
  },
  {
    name: "Format Converter",
    description: "Convert images between formats. PNG, JPG, WebP, and more.",
    href: "#",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    badge: "Coming Soon",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight">PicEdit</h1>
          <p className="text-muted mt-1">Free online image tools. No uploads, everything runs in your browser.</p>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-1">Image Tools</h2>
            <p className="text-sm text-muted">Select a tool to get started</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool) => {
              const isReady = tool.badge === "Ready";
              const Component = isReady ? Link : "div";

              return (
                <Component
                  key={tool.name}
                  href={tool.href}
                  className={`group relative flex flex-col p-6 bg-surface border border-border rounded-xl transition-all duration-200 ${
                    isReady
                      ? "hover:border-accent hover:bg-surface-hover cursor-pointer"
                      : "opacity-60 cursor-not-allowed"
                  }`}
                >
                  {/* Badge */}
                  <span
                    className={`absolute top-3 right-3 px-2 py-0.5 text-xs rounded-full ${
                      isReady
                        ? "bg-green-500/20 text-green-400"
                        : "bg-muted/20 text-muted"
                    }`}
                  >
                    {tool.badge}
                  </span>

                  {/* Icon */}
                  <div className={`mb-4 text-muted ${isReady ? "group-hover:text-accent" : ""} transition-colors`}>
                    {tool.icon}
                  </div>

                  {/* Content */}
                  <h3 className="font-medium mb-2">{tool.name}</h3>
                  <p className="text-sm text-muted leading-relaxed">{tool.description}</p>

                  {/* Arrow for ready tools */}
                  {isReady && (
                    <div className="mt-4 flex items-center text-sm text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Get started</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </Component>
              );
            })}
          </div>
        </div>

        {/* Features section */}
        <div className="mt-16 pt-12 border-t border-border">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-accent/10 text-accent">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">100% Private</h3>
              <p className="text-sm text-muted">Your images never leave your device. All processing happens locally in your browser.</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-accent/10 text-accent">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">Lightning Fast</h3>
              <p className="text-sm text-muted">Powered by WebGPU and modern AI models. Get results in seconds.</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-accent/10 text-accent">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">Completely Free</h3>
              <p className="text-sm text-muted">No sign-up, no limits, no watermarks. Use as much as you want.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col items-center gap-3">
          <div className="flex items-center gap-4 text-sm text-muted">
            <span>Built by AriajSarkar</span>
            <span className="w-px h-4 bg-border" />
            <a
              href="https://github.com/AriajSarkar/PicEdit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          </div>
          <p className="text-xs text-muted/70">Exported images include PicEdit metadata.</p>
        </div>
      </footer>
    </div>
  );
}
