import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessageProps {
	role: ChatRole
	content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
	const isUser = role === 'user'
	return (
		<div className={isUser ? 'flex justify-end' : ''}>
			<div className={
				'max-w-none whitespace-pre-wrap text-sm leading-6 rounded-lg px-4 py-3 border ' +
				(isUser ? 'bg-zinc-800/70 border-zinc-700' : 'bg-zinc-900/80 border-zinc-800')
			}>
				<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{content}</ReactMarkdown>
			</div>
		</div>
	)
}