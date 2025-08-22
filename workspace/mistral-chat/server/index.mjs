import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'

const app = express()
const PORT = process.env.PORT || 8787

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

function resolveSafePath(inputPath = '.') {
	const resolved = path.resolve(projectRoot, inputPath)
	if (!resolved.startsWith(projectRoot)) {
		throw new Error('Invalid path outside project root')
	}
	return resolved
}

app.use(cors())
app.use(express.json({ limit: '5mb' }))

// FS: list directory
app.get('/api/fs/list', async (req, res) => {
	try {
		const p = (req.query.path ?? '.').toString()
		const target = resolveSafePath(p)
		const dirents = await fs.readdir(target, { withFileTypes: true })
		const items = await Promise.all(dirents.map(async (d) => {
			const abs = path.join(target, d.name)
			const rel = path.relative(projectRoot, abs)
			return { name: d.name, path: rel, type: d.isDirectory() ? 'dir' : 'file' }
		}))
		res.json({ path: path.relative(projectRoot, target), items })
	} catch (e) {
		res.status(400).json({ error: String(e?.message || e) })
	}
})

// FS: read file
app.get('/api/fs/read', async (req, res) => {
	try {
		const p = (req.query.path ?? '').toString()
		if (!p) return res.status(400).json({ error: 'Missing path' })
		const target = resolveSafePath(p)
		const content = await fs.readFile(target, 'utf8')
		res.json({ path: p, content })
	} catch (e) {
		res.status(400).json({ error: String(e?.message || e) })
	}
})

// FS: write file
app.post('/api/fs/write', async (req, res) => {
	try {
		const { path: p, content } = req.body || {}
		if (!p || typeof content !== 'string') return res.status(400).json({ error: 'Missing path or content' })
		const target = resolveSafePath(p)
		await fs.mkdir(path.dirname(target), { recursive: true })
		await fs.writeFile(target, content, 'utf8')
		res.json({ ok: true })
	} catch (e) {
		res.status(400).json({ error: String(e?.message || e) })
	}
})

// FS: mkdir
app.post('/api/fs/mkdir', async (req, res) => {
	try {
		const { path: p } = req.body || {}
		if (!p) return res.status(400).json({ error: 'Missing path' })
		const target = resolveSafePath(p)
		await fs.mkdir(target, { recursive: true })
		res.json({ ok: true })
	} catch (e) {
		res.status(400).json({ error: String(e?.message || e) })
	}
})

// FS: rename/move
app.post('/api/fs/rename', async (req, res) => {
	try {
		const { from, to } = req.body || {}
		if (!from || !to) return res.status(400).json({ error: 'Missing from/to' })
		const src = resolveSafePath(from)
		const dst = resolveSafePath(to)
		await fs.mkdir(path.dirname(dst), { recursive: true })
		await fs.rename(src, dst)
		res.json({ ok: true })
	} catch (e) {
		res.status(400).json({ error: String(e?.message || e) })
	}
})

// FS: delete (file or dir)
app.post('/api/fs/delete', async (req, res) => {
	try {
		const { path: p } = req.body || {}
		if (!p) return res.status(400).json({ error: 'Missing path' })
		const target = resolveSafePath(p)
		await fs.rm(target, { recursive: true, force: true })
		res.json({ ok: true })
	} catch (e) {
		res.status(400).json({ error: String(e?.message || e) })
	}
})

// Search project
app.get('/api/search', async (req, res) => {
	const q = (req.query.q ?? '').toString()
	if (!q) return res.status(400).json({ error: 'Missing q' })
	const maxResults = 200
	const results = []
	const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build'])
	async function walk(dir) {
		const dirents = await fs.readdir(dir, { withFileTypes: true })
		for (const d of dirents) {
			const abs = path.join(dir, d.name)
			const rel = path.relative(projectRoot, abs)
			if (d.isDirectory()) {
				if (ignoreDirs.has(d.name)) continue
				await walk(abs)
				if (results.length >= maxResults) return
			} else {
				try {
					const text = await fs.readFile(abs, 'utf8')
					const lines = text.split(/\r?\n/)
					for (let i = 0; i < lines.length; i++) {
						const col = lines[i].indexOf(q)
						if (col !== -1) {
							results.push({ path: rel, line: i + 1, column: col + 1, preview: lines[i].slice(Math.max(0, col - 40), col + q.length + 80) })
							if (results.length >= maxResults) break
						}
					}
				} catch {}
			}
			if (results.length >= maxResults) return
		}
	}
	try {
		await walk(projectRoot)
		res.json({ q, results })
	} catch (e) {
		res.status(500).json({ error: String(e?.message || e) })
	}
})

// Exec: stream command output
app.post('/api/exec', async (req, res) => {
	try {
		const { cmd, cwd } = req.body || {}
		if (!cmd || typeof cmd !== 'string') return res.status(400).json({ error: 'Missing cmd' })
		const workDir = resolveSafePath(cwd || '.')
		res.setHeader('Content-Type', 'text/plain; charset=utf-8')
		res.setHeader('Transfer-Encoding', 'chunked')
		res.setHeader('Cache-Control', 'no-cache')
		const child = spawn(cmd, { cwd: workDir, shell: true, env: process.env })
		child.stdout.on('data', (d) => res.write(d))
		child.stderr.on('data', (d) => res.write(d))
		child.on('close', (code) => {
			res.write(`\n[exit ${code}]`)
			res.end()
		})
		child.on('error', (err) => {
			res.write(String(err))
			res.end()
		})
	} catch (e) {
		res.status(400).end(String(e?.message || e))
	}
})

// NPM: scripts
app.get('/api/npm/scripts', async (req, res) => {
	try {
		const pkgPath = resolveSafePath('package.json')
		const raw = await fs.readFile(pkgPath, 'utf8')
		const pkg = JSON.parse(raw)
		res.json({ scripts: pkg.scripts || {} })
	} catch (e) {
		res.status(500).json({ error: String(e?.message || e) })
	}
})

// NPM: install/uninstall via exec
app.post('/api/npm/install', async (req, res) => {
	const { pkg, dev } = req.body || {}
	if (!pkg) return res.status(400).json({ error: 'Missing pkg' })
	req.body = { cmd: `npm i ${dev ? '-D ' : ''}${pkg}`, cwd: '.' }
	return app._router.handle(req, res, () => {}) // delegate to /api/exec
})

app.post('/api/npm/uninstall', async (req, res) => {
	const { pkg } = req.body || {}
	if (!pkg) return res.status(400).json({ error: 'Missing pkg' })
	req.body = { cmd: `npm un ${pkg}`, cwd: '.' }
	return app._router.handle(req, res, () => {})
})

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
const root = path.resolve(__dirname, '..')
const distPath = path.join(root, 'dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
	res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`)
})