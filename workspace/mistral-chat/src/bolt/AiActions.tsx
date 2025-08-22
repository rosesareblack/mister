import { useState } from 'react'
import { streamChat } from '../api'
import { useSettings } from '../store/settings'

export function AiActions({ path, code, onApply }: { path: string; code: string; onApply: (next: string) => void }) {
	const settings = useSettings()
	const [working, setWorking] = useState(false)

	async function applyPrompt(prompt: string) {
		setWorking(true)
		let result = ''
		try {
			await streamChat({ messages: [
				{ role: 'system', content: 'You are a precise code editor. Given a file path and the current file content, output only the new full file content with the requested changes applied. Do not include explanations.' },
				{ role: 'user', content: `File: ${path}\n\nCurrent content:\n\n\n${code}\n\nChange request:\n${prompt}` },
			] }, {
				apiKey: settings.apiKey,
				model: settings.model,
				temperature: 0,
			}, (chunk) => { result += chunk })
			onApply(result)
		} finally {
			setWorking(false)
		}
	}

	return (
		<div className="flex items-center gap-2">
			<button disabled={working} onClick={()=> applyPrompt('Improve code readability and formatting without changing functionality.')} className="text-xs px-2 py-1 rounded border border-zinc-800 hover:bg-zinc-900 disabled:opacity-50">AI: Improve</button>
			<button disabled={working} onClick={()=> applyPrompt('Add comprehensive JSDoc or TS doc comments to the code.')} className="text-xs px-2 py-1 rounded border border-zinc-800 hover:bg-zinc-900 disabled:opacity-50">AI: Doc</button>
		</div>
	)
}