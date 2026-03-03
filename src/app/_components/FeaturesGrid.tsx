import { FEATURES } from '../_data/landing';

export function FeaturesGrid() {
	return (
		<section className="py-16 border-t border-(--border)">
			<div className="max-w-6xl mx-auto px-6">
				<div className="text-center mb-12">
					<h2 className="text-2xl sm:text-3xl font-bold mb-3">Built Different</h2>
					<p className="text-(--text-secondary)">
						What sets PicEdit apart from paid alternatives
					</p>
				</div>
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{FEATURES.map((f) => (
						<div key={f.title} className="card p-6 text-center">
							<div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-(--accent-soft) flex items-center justify-center text-(--accent)">
								{f.icon}
							</div>
							<h3 className="font-semibold mb-2">{f.title}</h3>
							<p className="text-sm text-(--text-secondary) leading-relaxed">
								{f.description}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
