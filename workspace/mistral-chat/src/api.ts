export interface ChatMessageParam {
	role: 'user' | 'assistant' | 'system'
	content: string
}

export interface ChatOptions {
	model?: string
	temperature?: number
	system?: string
	apiKey?: string
}

export async function streamChat(
	params: { messages: ChatMessageParam[] },
	opts: ChatOptions,
	onToken: (chunk: string) => void,
) {
	const res = await fetch('/api/chat', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...(opts.apiKey ? { 'x-api-key': opts.apiKey } : {}),
		},
		body: JSON.stringify({
			messages: params.messages,
			model: opts.model ?? 'mistral-large-latest',
			temperature: opts.temperature ?? 0.7,
			system: opts.system,
		}),
	})
	if (!res.ok || !res.body) throw new Error('Request failed')
	const reader = res.body.getReader()
	const decoder = new TextDecoder()
	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		const text = decoder.decode(value)
		if (text) onToken(text)
	}
}