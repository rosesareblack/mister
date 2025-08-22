import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const PORT = process.env.PORT || 8787

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.post('/api/chat', async (req, res) => {
	const apiKey = req.headers['x-api-key'] || process.env.MISTRAL_API_KEY
	if (!apiKey) {
		res.status(400).json({ error: 'Missing API key' })
		return
	}

	const { messages, model = 'mistral-large-latest', temperature = 0.7, system } = req.body || {}
	if (!Array.isArray(messages)) {
		res.status(400).json({ error: 'Invalid messages' })
		return
	}

	res.setHeader('Content-Type', 'text/plain; charset=utf-8')
	res.setHeader('Transfer-Encoding', 'chunked')
	res.setHeader('Cache-Control', 'no-cache')

	try {
		const body = {
			model,
			messages: [
				...(system ? [{ role: 'system', content: system }] : []),
				...messages,
			],
			stream: true,
			temperature,
		}
		const upstream = await fetch('https://api.mistral.ai/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				'Accept': 'text/event-stream',
			},
			body: JSON.stringify(body),
		})

		if (!upstream.ok || !upstream.body) {
			const text = await upstream.text()
			res.status(upstream.status).end(text)
			return
		}

		const reader = upstream.body.getReader()
		const decoder = new TextDecoder()
		let buffer = ''

		while (true) {
			const { done, value } = await reader.read()
			if (done) break
			buffer += decoder.decode(value, { stream: true })

			let idx
			while ((idx = buffer.indexOf('\n\n')) !== -1) {
				const rawEvent = buffer.slice(0, idx)
				buffer = buffer.slice(idx + 2)
				for (const line of rawEvent.split('\n')) {
					if (!line.startsWith('data:')) continue
					const data = line.slice(5).trim()
					if (data === '[DONE]') {
						res.end()
						return
					}
					try {
						const json = JSON.parse(data)
						const delta = json?.choices?.[0]?.delta?.content || ''
						if (delta) {
							res.write(delta)
						}
					} catch {}
				}
			}
		}
		res.end()
	} catch (err) {
		res.status(500).end('Upstream error')
	}
})

app.get('/api/health', (req, res) => res.json({ ok: true }))

// Serve static in production
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const distPath = path.join(root, 'dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
	res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`)
})