import { create } from 'zustand'
import { nanoid } from 'nanoid'

export type Role = 'user' | 'assistant' | 'system'

export interface Message {
	id: string
	role: Role
	content: string
	createdAt: number
}

export interface Conversation {
	id: string
	title: string
	messages: Message[]
	createdAt: number
	updatedAt: number
}

interface ChatState {
	conversations: Conversation[]
	activeId: string | null
	createConversation: () => void
	setActive: (id: string) => void
	appendMessage: (role: Role, content: string) => Message
	updateMessage: (id: string, content: string) => void
	appendToMessage: (id: string, delta: string) => void
}

const STORAGE_KEY = 'mistral-chat:v1'

function load(): Pick<ChatState, 'conversations' | 'activeId'> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return { conversations: [], activeId: null }
		return JSON.parse(raw)
	} catch {
		return { conversations: [], activeId: null }
	}
}

function save(state: Pick<ChatState, 'conversations' | 'activeId'>) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	} catch {}
}

export const useChatStore = create<ChatState>((set, _get) => ({
	...load(),
	createConversation: () => {
		const id = nanoid()
		const now = Date.now()
		const convo: Conversation = { id, title: 'New conversation', messages: [], createdAt: now, updatedAt: now }
		set((s) => {
			const next = { conversations: [convo, ...s.conversations], activeId: id }
			save(next)
			return next as any
		})
	},
	setActive: (id) => set((s) => {
		const next = { conversations: s.conversations, activeId: id }
		save(next)
		return next as any
	}),
	appendMessage: (role, content) => {
		const id = nanoid()
		const now = Date.now()
		const message: Message = { id, role, content, createdAt: now }
		set((s) => {
			const cid = s.activeId ?? (s.conversations[0]?.id ?? null)
			let conversations = s.conversations
			let activeId = cid
			if (!cid) {
				const newId = nanoid()
				conversations = [{ id: newId, title: 'New conversation', messages: [], createdAt: now, updatedAt: now }]
				activeId = newId
			}
			conversations = conversations.map((c) => c.id === activeId ? { ...c, messages: [...c.messages, message], updatedAt: now } : c)
			const next = { conversations, activeId }
			save(next)
			return next as any
		})
		return message
	},
	updateMessage: (id, content) => set((s) => {
		const now = Date.now()
		const conversations = s.conversations.map((c) => ({
			...c,
			messages: c.messages.map((m) => m.id === id ? { ...m, content } : m),
			updatedAt: now,
		}))
		const next = { conversations, activeId: s.activeId }
		save(next)
		return next as any
	}),
	appendToMessage: (id, delta) => set((s) => {
		const now = Date.now()
		const conversations = s.conversations.map((c) => ({
			...c,
			messages: c.messages.map((m) => m.id === id ? { ...m, content: m.content + delta } : m),
			updatedAt: now,
		}))
		const next = { conversations, activeId: s.activeId }
		save(next)
		return next as any
	}),
}))