import { useEffect, useState } from 'react'
import { Settings, Wrench } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { ChatMessage } from './components/ChatMessage'
import { useChatStore } from './store/chat'
import { Composer } from './components/Composer'
import { streamChat } from './api'
import { SettingsModal } from './components/SettingsModal'
import { useSettings } from './store/settings'
import { BoltWorkspace } from './bolt/BoltWorkspace'

function App() {
	const appendMessage = useChatStore((s) => s.appendMessage)
	const appendToMessage = useChatStore((s) => s.appendToMessage)
	const createConversation = useChatStore((s) => s.createConversation)
	const conversations = useChatStore((s) => s.conversations)
	const activeId = useChatStore((s) => s.activeId)
	const active = conversations.find((c) => c.id === activeId) ?? conversations[0]
	const settings = useSettings()
	const [openSettings, setOpenSettings] = useState(false)
	const [boltMode, setBoltMode] = useState(false)

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === ',') {
				e.preventDefault()
				setOpenSettings(true)
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
				e.preventDefault()
				createConversation()
			}
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
				e.preventDefault()
				setBoltMode((v) => !v)
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [])

	async function handleSend(text: string) {
		appendMessage('user', text)
		const assistant = appendMessage('assistant', '')
		try {
			const history = (active?.messages ?? []).map((m) => ({ role: m.role, content: m.content }))
			await streamChat({ messages: history.concat({ role: 'user', content: text }) }, {
				apiKey: settings.apiKey,
				model: settings.model,
				temperature: settings.temperature,
				system: settings.system,
			}, (chunk) => {
				appendToMessage(assistant.id, chunk)
			})
		} catch (e) {
			appendToMessage(assistant.id, '\n[Error contacting API]')
		}
	}

	return (
		<div className="h-screen grid grid-cols-[280px_1fr] bg-[#0b0b0f] text-zinc-100">
			<Sidebar />
			<main className="flex flex-col h-screen">
				<header className="h-12 border-b border-zinc-800 flex items-center px-4 justify-between">
					<div className="text-sm text-zinc-400">{boltMode ? 'Bolt Workspace' : 'Mistral Chat'}</div>
					<div className="flex items-center gap-2">
						<button onClick={() => setBoltMode((v)=>!v)} className="text-zinc-400 hover:text-zinc-200" title="Toggle Bolt (Ctrl/Cmd+B)"><Wrench size={16} /></button>
						<button onClick={() => setOpenSettings(true)} className="text-zinc-400 hover:text-zinc-200"><Settings size={16} /></button>
					</div>
				</header>
				{boltMode ? (
					<div className="flex-1 overflow-hidden">
						<BoltWorkspace />
					</div>
				) : (
					<>
						<div className="flex-1 overflow-y-auto p-4">
							<div className="max-w-3xl mx-auto space-y-4">
								{active?.messages.length ? active.messages.map((m) => (
									<ChatMessage key={m.id} role={m.role} content={m.content} />
								)) : (
									<div className="text-center text-zinc-500 text-sm pt-10">Start a conversation</div>
								)}
							</div>
						</div>
						<Composer onSubmit={handleSend} />
					</>
				)}
			</main>
			<SettingsModal open={openSettings} onClose={() => setOpenSettings(false)} />
		</div>
	)
}

export default App
