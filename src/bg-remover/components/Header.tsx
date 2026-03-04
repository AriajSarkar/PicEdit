'use client';

import { DeviceType, ModelType, MODEL_INFO } from '@/types';
import { ToolHeader } from '@/components/ToolHeader';

interface HeaderProps {
	device: DeviceType;
	setDevice: (device: DeviceType) => void;
	model: ModelType;
	setModel: (model: ModelType) => void;
}

export function Header({ device, setDevice, model, setModel }: HeaderProps) {
	return (
		<ToolHeader toolLabel="BG Remover" currentHref="/bg-remover">
			{/* Device Toggle */}
			<div className="flex bg-elevated rounded-full p-0.5 border border-border">
				{(['gpu', 'cpu'] as DeviceType[]).map((d) => (
					<button
						key={d}
						onClick={() => setDevice(d)}
						className={`px-4 py-2.5 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-full transition-all min-h-11 sm:min-h-0 ${
							device === d
								? 'bg-foreground text-background'
								: 'text-muted hover:text-secondary'
						}`}
					>
						{d.toUpperCase()}
					</button>
				))}
			</div>

			{/* Model Selector – mobile: dropdown, desktop: button group */}
			<select
				value={model}
				onChange={(e) => setModel(e.target.value as ModelType)}
				className="sm:hidden px-3 py-2 min-h-11 text-xs font-semibold rounded-full bg-elevated border border-border text-foreground"
			>
				{(Object.keys(MODEL_INFO) as ModelType[]).map((m) => (
					<option key={m} value={m}>
						{MODEL_INFO[m].name}
					</option>
				))}
			</select>

			<div className="hidden sm:flex bg-elevated rounded-full p-0.5 border border-border">
				{(Object.keys(MODEL_INFO) as ModelType[]).map((m) => (
					<button
						key={m}
						onClick={() => setModel(m)}
						className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
							model === m
								? 'bg-linear-to-r from-accent to-accent-hover text-white'
								: 'text-muted hover:text-secondary'
						}`}
						title={`${MODEL_INFO[m].size} - ${MODEL_INFO[m].precision}`}
					>
						{MODEL_INFO[m].name}
					</button>
				))}
			</div>
		</ToolHeader>
	);
}
