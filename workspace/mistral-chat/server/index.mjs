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

function run(cmd, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { cwd: projectRoot, shell: false, env: process.env, ...options })
		let out = ''
		let err = ''
		child.stdout.on('data', (d) => { out += d.toString() })
		child.stderr.on('data', (d) => { err += d.toString() })
		child.on('close', (code) => {
			if (code === 0) resolve({ code, out, err })
			else reject(new Error(err || out || `exit ${code}`))
		})
		child.on('error', (e) => reject(e))
	})
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

// Git endpoints
app.get('/api/git/status', async (req, res) => {
	try {
		const { out } = await run('git', ['status', '--porcelain=v1', '--branch'])
		res.json({ text: out })
	} catch (e) {
		res.status(500).json({ error: String(e?.message || e) })
	}
})

app.get('/api/git/diff', async (req, res) => {
	try {
		const p = req.query.path?.toString()
		let args = ['diff']
		if (p) args = ['diff', '--', p]
		const { out } = await run('git', args)
		res.type('text/plain').send(out)
	} catch (e) {
		res.status(500).send(String(e?.message || e))
	}
})

app.post('/api/git/stage', async (req, res) => {
	try {
		const { paths } = req.body || {}
		if (!Array.isArray(paths) || paths.length === 0) return res.status(400).json({ error: 'Missing paths' })
		const args = ['add', '--'].concat(paths)
		await run('git', args)
		res.json({ ok: true })
	} catch (e) {
		res.status(500).json({ error: String(e?.message || e) })
	}
})

app.post('/api/git/unstage', async (req, res) => {
	try {
		const { paths } = req.body || {}
		if (!Array.isArray(paths) || paths.length === 0) return res.status(400).json({ error: 'Missing paths' })
		const args = ['reset', 'HEAD', '--'].concat(paths)
		await run('git', args)
		res.json({ ok: true })
	} catch (e) {
		res.status(500).json({ error: String(e?.message || e) })
	}
})

app.post('/api/git/commit', async (req, res) => {
	try {
		const { message } = req.body || {}
		if (!message) return res.status(400).json({ error: 'Missing message' })
		await run('git', ['commit', '-m', message])
		res.json({ ok: true })
	} catch (e) {
		res.status(500).json({ error: String(e?.message || e) })
	}
})

app.get('/api/git/branches', async (req, res) => {
	try {
		const { out } = await run('git', ['branch', '-a'])
		res.type('text/plain').send(out)
	} catch (e) {
		res.status(500).send(String(e?.message || e))
	}
})

app.post('/api/git/checkout', async (req, res) => {
	try {
		const { ref } = req.body || {}
		if (!ref) return res.status(400).json({ error: 'Missing ref' })
		await run('git', ['checkout', ref])
		res.json({ ok: true })
	} catch (e) {
		res.status(500).json({ error: String(e?.message || e) })
	}
})

app.post('/api/git/push', async (req, res) => {
	try {
		const { remote = 'origin', branch } = req.body || {}
		const args = branch ? ['push', remote, branch] : ['push', remote]
		const { out } = await run('git', args)
		res.type('text/plain').send(out)
	} catch (e) {
		res.status(500).send(String(e?.message || e))
	}
})

app.post('/api/git/pull', async (req, res) => {
	try {
		const { remote = 'origin', branch } = req.body || {}
		const args = branch ? ['pull', remote, branch] : ['pull', remote]
		const { out } = await run('git', args)
		res.type('text/plain').send(out)
	} catch (e) {
		res.status(500).send(String(e?.message || e))
	}
})

app.post('/api/git/init', async (req, res) => {
	try {
		await run('git', ['init'])
		res.json({ ok: true })
	} catch (e) {
		res.status(500).json({ error: String(e?.message || e) })
	}
})

// Import/clone templates
app.post('/api/import/clone', async (req, res) => {
	try {
		const { repo, dir } = req.body || {}
		if (!repo) return res.status(400).json({ error: 'Missing repo' })
		const targetDir = resolveSafePath(dir || '.')
		await fs.mkdir(targetDir, { recursive: true })
		const args = ['clone', repo]
		if (dir) args.push(dir)
		const { out } = await run('git', args)
		res.type('text/plain').send(out)
	} catch (e) {
		res.status(500).send(String(e?.message || e))
	}
})

// GitHub PR creation
app.post('/api/github/create-pr', async (req, res) => {
	try {
		const token = req.headers['x-github-token'] || process.env.GITHUB_TOKEN
		if (!token) return res.status(400).json({ error: 'Missing GitHub token' })
		const { owner, repo, title, head, base = 'main', body } = req.body || {}
		if (!owner || !repo || !title || !head) return res.status(400).json({ error: 'Missing required fields' })
		const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Accept': 'application/vnd.github+json',
				'User-Agent': 'mistral-chat-bolt',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ title, head, base, body }),
		})
		const text = await ghRes.text()
		res.status(ghRes.status).type('application/json').send(text)
	} catch (e) {
		res.status(500).json({ error: String(e?.message || e) })
	}
})

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`)
})