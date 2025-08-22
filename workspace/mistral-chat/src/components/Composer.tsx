import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Send } from 'lucide-react'

export function Composer({ onSubmit }: { onSubmit: (value: string) => void }) {
	const [value, setValue] = useState('')

	function handleSubmit(e: FormEvent) {
		e.preventDefault()
		const v = value.trim()
		if (!v) return
		onSubmit(v)
		setValue('')
	}

	function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit(e as any)
		}
	}

	return (
		<form onSubmit={handleSubmit} className="border-t border-zinc-800 p-4">
			<div className="max-w-3xl mx-auto">
				<div className="relative">
					<TextareaAutosize
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={onKeyDown}
						minRows={1}
						maxRows={8}
						placeholder="Send a message..."
						className="w-full resize-none bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 pr-10 outline-none focus:border-zinc-700 text-sm"
					/>
					<button type="submit" className="absolute right-2 bottom-2 p-2 text-zinc-400 hover:text-zinc-200" aria-label="Send">
						<Send size={16} />
					</button>
				</div>
			</div>
		</form>
	)
}