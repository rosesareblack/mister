import { useState, useEffect } from 'react'
import { useSettings } from '../store/settings'

export function SettingsModal({ open, onClose }: { open: boolean, onClose: () => void }) {
	const settings = useSettings()
	const [apiKey, setApiKey] = useState(settings.apiKey)
	const [model, setModel] = useState(settings.model)
	const [temperature, setTemperature] = useState(settings.temperature)
	const [system, setSystem] = useState(settings.system)
	const [theme, setTheme] = useState(settings.theme)
	const [githubToken, setGithubToken] = useState(settings.githubToken || '')

	useEffect(() => {
		if (open) {
			setApiKey(settings.apiKey)
			setModel(settings.model)
			setTemperature(settings.temperature)
			setSystem(settings.system)
			setTheme(settings.theme)
			setGithubToken(settings.githubToken || '')
		}
	}, [open])

	function save() {
		useSettings.getState().update({ apiKey, model, temperature, system, theme, githubToken })
		onClose()
	}

	if (!open) return null

	return (
		<div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
			<div className="w-full sm:max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-xl sm:rounded-xl p-4 sm:p-6 space-y-4">
				<div className="text-base font-semibold">Settings</div>
				<div className="space-y-3">
					<label className="block text-sm">Mistral API Key</label>
					<input type="password" value={apiKey} onChange={(e)=>setApiKey(e.target.value)} placeholder="sk-..." className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm outline-none focus:border-zinc-700" />
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="space-y-2">
						<label className="block text-sm">Model</label>
						<select value={model} onChange={(e)=>setModel(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm outline-none focus:border-zinc-700">
							<option value="mistral-large-latest">mistral-large-latest</option>
							<option value="mistral-small-latest">mistral-small-latest</option>
							<option value="codestral-latest">codestral-latest</option>
						</select>
					</div>
					<div className="space-y-2">
						<label className="block text-sm">Temperature: {temperature.toFixed(1)}</label>
						<input type="range" min={0} max={1} step={0.1} value={temperature} onChange={(e)=>setTemperature(parseFloat(e.target.value))} className="w-full" />
					</div>
					<div className="space-y-2">
						<label className="block text-sm">Theme</label>
						<select value={theme} onChange={(e)=>setTheme(e.target.value as any)} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm outline-none focus:border-zinc-700">
							<option value="dark">Dark</option>
							<option value="light">Light</option>
						</select>
					</div>
				</div>
				<div className="space-y-2">
					<label className="block text-sm">System prompt</label>
					<textarea value={system} onChange={(e)=>setSystem(e.target.value)} rows={3} className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm outline-none focus:border-zinc-700" />
				</div>
				<div className="space-y-2">
					<label className="block text-sm">GitHub Token (for PRs)</label>
					<input type="password" value={githubToken} onChange={(e)=>setGithubToken(e.target.value)} placeholder="ghp_..." className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm outline-none focus:border-zinc-700" />
				</div>
				<div className="flex items-center justify-end gap-3 pt-2">
					<button onClick={onClose} className="px-3 py-2 rounded border border-zinc-800 hover:bg-zinc-900 text-sm">Cancel</button>
					<button onClick={save} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm">Save</button>
				</div>
			</div>
		</div>
	)
}