import Link from "next/link";

const TOOLS = [
  {
    name: "Background Remover",
    description: "AI-powered background removal. Upload, process, download — 3 taps.",
    href: "/bg-remover",
    badge: "Ready",
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    iconBg: "bg-violet-500/10",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: "Image Compressor",
    description: "WASM-powered compression. Visually lossless at a fraction of the file size.",
    href: "/img-compressor",
    badge: "Ready",
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    iconBg: "bg-amber-500/10",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    name: "Image Resizer",
    description: "Resize to any dimension. Social media presets, custom sizes, batch support.",
    href: "#",
    badge: "Coming Soon",
    gradient: "from-cyan-500 via-blue-500 to-indigo-500",
    iconBg: "bg-cyan-500/10",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
  },
  {
    name: "Format Converter",
    description: "Convert between PNG, JPG, WebP, AVIF and more. Batch supported.",
    href: "#",
    badge: "Coming Soon",
    gradient: "from-emerald-500 via-green-500 to-teal-500",
    iconBg: "bg-emerald-500/10",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
];

const FEATURES = [
  {
    title: "100% Private",
    description: "Your images never leave your device. No server uploads, no tracking.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: "Blazing Fast",
    description: "WebGPU + WASM acceleration. Rust algorithms at near-native speed.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Free Forever",
    description: "No sign-up, no limits, no watermarks. Premium quality, zero cost.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Multi-Processing",
    description: "Chrome-like process isolation. Batch process in parallel.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const COMPARISON = [
  { feature: "Background Removal", picedit: true, removebg: true, tinypng: false, iloveimg: false },
  { feature: "Image Compression", picedit: true, removebg: false, tinypng: true, iloveimg: true },
  { feature: "Batch Processing", picedit: true, removebg: "Paid", tinypng: "Paid", iloveimg: "Limited" },
  { feature: "No Watermarks", picedit: true, removebg: "Paid", tinypng: true, iloveimg: true },
  { feature: "Unlimited Usage", picedit: true, removebg: false, tinypng: false, iloveimg: false },
  { feature: "100% Client-Side", picedit: true, removebg: false, tinypng: false, iloveimg: false },
  { feature: "No Sign-up", picedit: true, removebg: false, tinypng: false, iloveimg: true },
  { feature: "Price", picedit: "Free", removebg: "$5.99/mo", tinypng: "$25/yr", iloveimg: "$6/mo" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--foreground)] relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[var(--accent)] opacity-[0.03] blur-[120px] rounded-full" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">PicEdit</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <Link href="/bg-remover" className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">BG Remover</Link>
            <Link href="/img-compressor" className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">Compressor</Link>
            <a href="https://github.com/AriajSarkar/PicEdit" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              GitHub
            </a>
          </nav>
          {/* Mobile nav */}
          <div className="flex sm:hidden items-center gap-2">
            <Link href="/bg-remover" className="px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-white/5 rounded-lg transition-all">BG</Link>
            <Link href="/img-compressor" className="px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-white/5 rounded-lg transition-all">Compress</Link>
            <a href="https://github.com/AriajSarkar/PicEdit" target="_blank" rel="noopener noreferrer" className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-16 sm:pt-28 sm:pb-24">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-secondary)] mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
            100% free &middot; No sign-up &middot; Runs in your browser
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Image tools that<br />
            <span className="text-gradient">others charge for.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Professional background removal, WASM-powered compression, and more.
            Private, fast, and completely free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/bg-remover" className="btn-primary px-8 py-3.5 text-base inline-flex items-center gap-2">
              Remove Background
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <Link href="/img-compressor" className="btn-secondary px-8 py-3.5 text-base inline-flex items-center gap-2">
              Compress Images
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>

          {/* 3-Tap flow */}
          <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
            {[
              { step: "1", label: "Upload", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
              { step: "2", label: "Process", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { step: "3", label: "Download", icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" },
            ].map((s, i) => (
              <div key={s.step} className="flex items-center gap-3">
                {i > 0 && <svg className="w-4 h-4 text-[var(--text-muted)] hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
                    <svg className="w-4 h-4 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">Step {s.step}</p>
                    <p className="text-sm font-medium">{s.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="py-16 relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Professional Image Tools</h2>
            <p className="text-[var(--text-secondary)]">Select a tool to get started — no account needed</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool) => {
              const isReady = tool.badge === "Ready";
              const Component = isReady ? Link : "div";
              return (
                <Component key={tool.name} href={tool.href} className={`group card card-hover relative flex flex-col p-6 ${isReady ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}>
                  {isReady && <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />}
                  <span className={`absolute top-4 right-4 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full ${isReady ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-white/5 text-[var(--text-muted)]"}`}>{tool.badge}</span>
                  <div className={`w-12 h-12 rounded-xl ${tool.iconBg} flex items-center justify-center mb-4 text-[var(--text-secondary)] group-hover:text-[var(--foreground)] transition-colors`}>{tool.icon}</div>
                  <h3 className="text-base font-semibold mb-2">{tool.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">{tool.description}</p>
                  {isReady && (
                    <div className="mt-4 flex items-center text-sm text-[var(--accent)] font-medium opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
                      <span>Get started</span>
                      <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  )}
                </Component>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Built Different</h2>
            <p className="text-[var(--text-secondary)]">What sets PicEdit apart from paid alternatives</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">{f.icon}</div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Why Pay When It&apos;s Free?</h2>
            <p className="text-[var(--text-secondary)]">Compare PicEdit with paid alternatives</p>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left px-3 sm:px-6 py-4 font-medium text-[var(--text-secondary)]">Feature</th>
                    <th className="px-3 sm:px-6 py-4 font-semibold text-[var(--accent)]">PicEdit</th>
                    <th className="px-3 sm:px-6 py-4 font-medium text-[var(--text-secondary)]">remove.bg</th>
                    <th className="px-3 sm:px-6 py-4 font-medium text-[var(--text-secondary)]">TinyPNG</th>
                    <th className="px-3 sm:px-6 py-4 font-medium text-[var(--text-secondary)]">iLoveIMG</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-white/[0.01]" : ""}>
                      <td className="px-3 sm:px-6 py-3 font-medium">{row.feature}</td>
                      {[row.picedit, row.removebg, row.tinypng, row.iloveimg].map((val, j) => (
                        <td key={j} className="px-3 sm:px-6 py-3 text-center">
                          {val === true ? (
                            <span className="inline-flex w-5 h-5 rounded-full bg-[var(--success-soft)] items-center justify-center">
                              <svg className="w-3 h-3 text-[var(--success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            </span>
                          ) : val === false ? (
                            <span className="inline-flex w-5 h-5 rounded-full bg-[var(--error-soft)] items-center justify-center">
                              <svg className="w-3 h-3 text-[var(--error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </span>
                          ) : (
                            <span className={`text-xs font-medium ${j === 0 ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>{val as string}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Free Alternatives */}
      <section className="py-12 border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            Want another free option?{" "}
            <a
              href="https://bgbye.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline font-medium"
            >
              bgbye.io
            </a>{" "}
            is also a great free background remover — because everyone deserves free tools.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
              <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
            </div>
            <span className="text-sm text-[var(--text-secondary)]">Built by <a href="https://github.com/AriajSarkar" target="_blank" rel="noopener noreferrer" className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">AriajSarkar</a></span>
          </div>
          <div className="flex items-center gap-5 text-sm text-[var(--text-muted)]">
            <a href="https://github.com/AriajSarkar/PicEdit" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[var(--foreground)] transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              Star on GitHub
            </a>
            <span className="w-px h-4 bg-[var(--border)]" />
            <span>Open Source</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
