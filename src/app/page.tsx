import Link from 'next/link';

import { ComparisonTable } from './_components/ComparisonTable';
import { FeaturesGrid } from './_components/FeaturesGrid';
import { HeroSection } from './_components/HeroSection';
import { ToolCards } from './_components/ToolCards';

export default function Home() {
	return (
		<div className="min-h-screen bg-background text-foreground relative overflow-hidden">
			{/* Background glow */}
			<div className="fixed inset-0 pointer-events-none">
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-200 h-125 bg-accent opacity-[0.03] blur-[120px] rounded-full" />
			</div>

			{/* Nav */}
			<header className="sticky top-0 z-50 glass">
				<div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-lg bg-linear-to-br from-accent to-accent-hover flex items-center justify-center">
							<svg
								className="w-4 h-4 text-white"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={2.5}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
								/>
							</svg>
						</div>
						<span className="text-lg font-bold tracking-tight">PicEdit</span>
					</div>
					<nav className="hidden sm:flex items-center gap-6 text-sm">
						<Link
							href="/bg-remover"
							className="text-(--text-secondary) hover:text-foreground transition-colors"
						>
							BG Remover
						</Link>
						<Link
							href="/img-compressor"
							className="text-(--text-secondary) hover:text-foreground transition-colors"
						>
							Compressor
						</Link>
						<a
							href="https://github.com/AriajSarkar/PicEdit"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 text-(--text-secondary) hover:text-foreground transition-colors"
						>
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
							</svg>
							GitHub
						</a>
					</nav>
					{/* Mobile nav */}
					<div className="flex sm:hidden items-center gap-2">
						<Link
							href="/bg-remover"
							className="px-3 py-2 text-xs font-medium text-(--text-secondary) hover:text-foreground hover:bg-white/5 rounded-lg transition-all"
						>
							BG
						</Link>
						<Link
							href="/img-compressor"
							className="px-3 py-2 text-xs font-medium text-(--text-secondary) hover:text-foreground hover:bg-white/5 rounded-lg transition-all"
						>
							Compress
						</Link>
						<a
							href="https://github.com/AriajSarkar/PicEdit"
							target="_blank"
							rel="noopener noreferrer"
							className="p-2.5 text-(--text-secondary) hover:text-foreground transition-colors"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
							</svg>
						</a>
					</div>
				</div>
			</header>

			<HeroSection />
			<ToolCards />
			<FeaturesGrid />
			<ComparisonTable />

			{/* Free Alternatives */}
			<section className="py-12 border-t border-border">
				<div className="max-w-4xl mx-auto px-6 text-center">
					<p className="text-(--text-secondary) text-sm leading-relaxed">
						Want another free option?{' '}
						<a
							href="https://bgbye.io/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-accent hover:underline font-medium"
						>
							bgbye.io
						</a>{' '}
						is also a great free background remover — because everyone deserves free
						tools.
					</p>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-border py-8">
				<div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="w-6 h-6 rounded-md bg-linear-to-br from-accent to-accent-hover flex items-center justify-center">
							<svg
								className="w-3 h-3 text-white"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={2.5}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
								/>
							</svg>
						</div>
						<span className="text-sm text-(--text-secondary)">
							Built by{' '}
							<a
								href="https://github.com/AriajSarkar"
								target="_blank"
								rel="noopener noreferrer"
								className="text-foreground hover:text-accent transition-colors"
							>
								AriajSarkar
							</a>
						</span>
					</div>
					<div className="flex items-center gap-5 text-sm text-muted">
						<a
							href="https://github.com/AriajSarkar/PicEdit"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 hover:text-foreground transition-colors"
						>
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
							</svg>
							Star on GitHub
						</a>
						<span className="w-px h-4 bg-border" />
						<span>Open Source</span>
					</div>
				</div>
			</footer>
		</div>
	);
}
