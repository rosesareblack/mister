import { useChatStore } from '../store/chat'
import { Plus } from 'lucide-react'

export function Sidebar() {
	const conversations = useChatStore((s) => s.conversations)
	const activeId = useChatStore((s) => s.activeId)
	const setActive = useChatStore((s) => s.setActive)
	const createConversation = useChatStore((s) => s.createConversation)

	return (
		<aside className="border-r border-zinc-800 flex flex-col">
			<header className="p-3 border-b border-zinc-800 flex items-center justify-between">
				<h1 className="text-sm font-semibold text-zinc-300">Chats</h1>
				<button onClick={createConversation} className="p-2 rounded hover:bg-zinc-800" aria-label="New chat">
					<Plus size={16} />
				</button>
			</header>
			<div className="p-2 overflow-y-auto flex-1 space-y-1">
				{conversations.length === 0 && (
					<button onClick={createConversation} className="w-full px-3 py-2 rounded text-left hover:bg-zinc-800/60 text-sm">New conversation</button>
				)}
				{conversations.map((c) => (
					<button key={c.id} onClick={() => setActive(c.id)} className={
						"w-full px-3 py-2 rounded text-left text-sm truncate " +
						(activeId === c.id ? 'bg-zinc-800 text-zinc-100' : 'hover:bg-zinc-800/60 text-zinc-300')
					}>
						{c.title}
					</button>
				))}
			</div>
		</aside>
	)
}