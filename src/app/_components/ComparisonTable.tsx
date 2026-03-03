import { COMPARISON } from '../_data/landing';

export function ComparisonTable() {
	return (
		<section className="py-16 border-t border-border">
			<div className="max-w-4xl mx-auto px-6">
				<div className="text-center mb-12">
					<h2 className="text-2xl sm:text-3xl font-bold mb-3">
						Why Pay When It&apos;s Free?
					</h2>
					<p className="text-(--text-secondary)">
						Compare PicEdit with paid alternatives
					</p>
				</div>
				<div className="card overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-border">
									<th className="text-left px-3 sm:px-6 py-4 font-medium text-(--text-secondary)">
										Feature
									</th>
									<th className="px-3 sm:px-6 py-4 font-semibold text-accent">
										PicEdit
									</th>
									<th className="px-3 sm:px-6 py-4 font-medium text-(--text-secondary)">
										remove.bg
									</th>
									<th className="px-3 sm:px-6 py-4 font-medium text-(--text-secondary)">
										TinyPNG
									</th>
									<th className="px-3 sm:px-6 py-4 font-medium text-(--text-secondary)">
										iLoveIMG
									</th>
								</tr>
							</thead>
							<tbody>
								{COMPARISON.map((row, i) => (
									<tr
										key={row.feature}
										className={i % 2 === 0 ? 'bg-white/1' : ''}
									>
										<td className="px-3 sm:px-6 py-3 font-medium">
											{row.feature}
										</td>
										{[row.picedit, row.removebg, row.tinypng, row.iloveimg].map(
											(val, j) => (
												<td
													key={j}
													className="px-3 sm:px-6 py-3 text-center"
												>
													{val === true ? (
														<span className="inline-flex w-5 h-5 rounded-full bg-(--success-soft) items-center justify-center">
															<svg
																className="w-3 h-3 text-(--success)"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={3}
																	d="M5 13l4 4L19 7"
																/>
															</svg>
														</span>
													) : val === false ? (
														<span className="inline-flex w-5 h-5 rounded-full bg-(--error-soft) items-center justify-center">
															<svg
																className="w-3 h-3 text-(--error)"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={3}
																	d="M6 18L18 6M6 6l12 12"
																/>
															</svg>
														</span>
													) : (
														<span
															className={`text-xs font-medium ${j === 0 ? 'text-accent' : 'text-muted'}`}
														>
															{val as string}
														</span>
													)}
												</td>
											),
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</section>
	);
}
