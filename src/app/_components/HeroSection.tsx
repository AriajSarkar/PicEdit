import Link from 'next/link';

export function HeroSection() {
	return (
		<section className="relative pt-20 pb-16 sm:pt-28 sm:pb-24">
			<div className="max-w-6xl mx-auto px-6 text-center">
				<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-(--border) bg-(--bg-surface) text-xs font-medium text-(--text-secondary) mb-8">
					<span className="w-2 h-2 rounded-full bg-(--success) animate-pulse" />
					100% free &middot; No sign-up &middot; Runs in your browser
				</div>

				<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
					Image tools that
					<br />
					<span className="text-gradient">others charge for.</span>
				</h1>

				<p className="text-lg sm:text-xl text-(--text-secondary) max-w-2xl mx-auto mb-10 leading-relaxed">
					Professional background removal, WASM-powered compression, and more. Private,
					fast, and completely free.
				</p>

				<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
					<Link
						href="/bg-remover"
						className="btn-primary px-8 py-3.5 text-base inline-flex items-center gap-2"
					>
						Remove Background
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M13 7l5 5m0 0l-5 5m5-5H6"
							/>
						</svg>
					</Link>
					<Link
						href="/img-compressor"
						className="btn-secondary px-8 py-3.5 text-base inline-flex items-center gap-2"
					>
						Compress Images
						<svg
							className="w-4 h-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M13 7l5 5m0 0l-5 5m5-5H6"
							/>
						</svg>
					</Link>
				</div>

				{/* 3-Tap flow */}
				<div className="mt-12 inline-flex flex-wrap items-center justify-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 rounded-2xl border border-(--border) bg-(--bg-surface)">
					{[
						{
							step: '1',
							label: 'Upload',
							icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
						},
						{ step: '2', label: 'Process', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
						{
							step: '3',
							label: 'Download',
							icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
						},
					].map((s, i) => (
						<div key={s.step} className="flex items-center gap-3">
							{i > 0 && (
								<svg
									className="w-4 h-4 text-(--text-muted) hidden sm:block"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5l7 7-7 7"
									/>
								</svg>
							)}
							<div className="flex items-center gap-2">
								<div className="w-8 h-8 rounded-full bg-(--accent-soft) flex items-center justify-center">
									<svg
										className="w-4 h-4 text-(--accent)"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d={s.icon}
										/>
									</svg>
								</div>
								<div className="text-left">
									<p className="text-[10px] text-(--text-muted) font-medium uppercase tracking-wider">
										Step {s.step}
									</p>
									<p className="text-sm font-medium">{s.label}</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
