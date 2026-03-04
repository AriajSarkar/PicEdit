import { FEATURES } from '../_data/landing';

export function FeaturesGrid() {
	return (
		<section className="relative py-16 border-t border-border">
			<div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-accent/20 to-transparent" />
			<div className="max-w-6xl mx-auto px-6">
				<div className="text-center mb-12">
					<p className="text-xs font-semibold uppercase tracking-widest text-accent mb-3">
						Why PicEdit
					</p>
					<h2 className="text-2xl sm:text-3xl font-bold mb-3">Built Different</h2>
					<p className="text-secondary">
						What sets PicEdit apart from paid alternatives
					</p>
				</div>
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{FEATURES.map((f) => (
						<div
							key={f.title}
							className="card card-hover p-6 text-center group"
						>
							<div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-accent-soft flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-200">
								{f.icon}
							</div>
							<h3 className="font-semibold mb-2">{f.title}</h3>
							<p className="text-sm text-secondary leading-relaxed">
								{f.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
