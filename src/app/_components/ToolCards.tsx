import Link from 'next/link';
import { TOOLS } from '../_data/landing';

export function ToolCards() {
	return (
		<section className="py-16 relative">
			<div className="max-w-6xl mx-auto px-6">
				<div className="text-center mb-12">
					<h2 className="text-2xl sm:text-3xl font-bold mb-3">
						Professional Image Tools
					</h2>
					<p className="text-(--text-secondary)">
						Select a tool to get started — no account needed
					</p>
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{TOOLS.map((tool) => {
						const isReady = tool.badge === 'Ready';
						const Component = isReady ? Link : 'div';
						return (
							<Component
								key={tool.name}
								href={tool.href}
								className={`group card card-hover relative flex flex-col p-6 ${isReady ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
							>
								{isReady && (
									<div
										className={`absolute inset-x-0 top-0 h-px bg-linear-to-r ${tool.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}
									/>
								)}
								<span
									className={`absolute top-4 right-4 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full ${isReady ? 'bg-(--success-soft) text-(--success)' : 'bg-white/5 text-muted'}`}
								>
									{tool.badge}
								</span>
								<div
									className={`w-12 h-12 rounded-xl ${tool.iconBg} flex items-center justify-center mb-4 text-(--text-secondary) group-hover:text-foreground transition-colors`}
								>
									{tool.icon}
								</div>
								<h3 className="text-base font-semibold mb-2">{tool.name}</h3>
								<p className="text-sm text-(--text-secondary) leading-relaxed flex-1">
									{tool.description}
								</p>
								{isReady && (
									<div className="mt-4 flex items-center text-sm text-accent font-medium opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
										<span>Get started</span>
										<svg
											className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
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
									</div>
								)}
							</Component>
						);
					})}
				</div>
			</div>
		</section>
	);
}
