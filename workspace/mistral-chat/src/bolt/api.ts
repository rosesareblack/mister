export interface FsItem { name: string; path: string; type: 'file' | 'dir' }

export async function fsList(pathname = '.') {
	const res = await fetch(`/api/fs/list?path=${encodeURIComponent(pathname)}`)
	if (!res.ok) throw new Error(await res.text())
	return res.json() as Promise<{ path: string; items: FsItem[] }>
}

export async function fsRead(pathname: string) {
	const res = await fetch(`/api/fs/read?path=${encodeURIComponent(pathname)}`)
	if (!res.ok) throw new Error(await res.text())
	return res.json() as Promise<{ path: string; content: string }>
}

export async function fsWrite(pathname: string, content: string) {
	const res = await fetch('/api/fs/write', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ path: pathname, content }),
	})
	if (!res.ok) throw new Error(await res.text())
	return res.json() as Promise<{ ok: true }>
}

export async function fsMkdir(pathname: string) {
	const res = await fetch('/api/fs/mkdir', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: pathname }) })
	if (!res.ok) throw new Error(await res.text())
	return res.json() as Promise<{ ok: true }>
}

export async function fsRename(from: string, to: string) {
	const res = await fetch('/api/fs/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to }) })
	if (!res.ok) throw new Error(await res.text())
	return res.json() as Promise<{ ok: true }>
}

export async function fsDelete(pathname: string) {
	const res = await fetch('/api/fs/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: pathname }) })
	if (!res.ok) throw new Error(await res.text())
	return res.json() as Promise<{ ok: true }>
}

export async function searchProject(q: string) {
	const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
	if (!res.ok) throw new Error(await res.text())
	return res.json() as Promise<{ q: string; results: { path: string; line: number; column: number; preview: string }[] }>
}

export async function listScripts() {
	const res = await fetch('/api/npm/scripts')
	if (!res.ok) throw new Error(await res.text())
	return res.json() as Promise<{ scripts: Record<string, string> }>
}

export async function npmInstall(pkg: string, dev = false) {
	const res = await fetch('/api/npm/install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pkg, dev }) })
	if (!res.ok) throw new Error(await res.text())
	return res.text()
}

export async function npmUninstall(pkg: string) {
	const res = await fetch('/api/npm/uninstall', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pkg }) })
	if (!res.ok) throw new Error(await res.text())
	return res.text()
}

export async function execStream(cmd: string, cwd = '.') {
	const res = await fetch('/api/exec', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ cmd, cwd }),
	})
	if (!res.ok || !res.body) throw new Error('exec failed')
	const reader = res.body.getReader()
	const decoder = new TextDecoder()
	return {
		async *[Symbol.asyncIterator](): AsyncGenerator<string> {
			while (true) {
				const { done, value } = await reader.read()
				if (done) break
				yield decoder.decode(value)
			}
		},
	}
}

// Git helpers
export async function gitStatus() { const r = await fetch('/api/git/status'); if (!r.ok) throw new Error(await r.text()); return r.json() as Promise<{ text: string }> }
export async function gitDiff(path?: string) { const r = await fetch('/api/git/diff' + (path ? `?path=${encodeURIComponent(path)}` : '')); if (!r.ok) throw new Error(await r.text()); return r.text() }
export async function gitStage(paths: string[]) { const r = await fetch('/api/git/stage', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ paths })}); if (!r.ok) throw new Error(await r.text()); return r.json() }
export async function gitUnstage(paths: string[]) { const r = await fetch('/api/git/unstage', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ paths })}); if (!r.ok) throw new Error(await r.text()); return r.json() }
export async function gitCommit(message: string) { const r = await fetch('/api/git/commit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message })}); if (!r.ok) throw new Error(await r.text()); return r.json() }
export async function gitBranches() { const r = await fetch('/api/git/branches'); if (!r.ok) throw new Error(await r.text()); return r.text() }
export async function gitCheckout(ref: string) { const r = await fetch('/api/git/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ref })}); if (!r.ok) throw new Error(await r.text()); return r.json() }
export async function gitPush(remote='origin', branch?: string) { const r = await fetch('/api/git/push', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ remote, branch })}); if (!r.ok) throw new Error(await r.text()); return r.text() }
export async function gitPull(remote='origin', branch?: string) { const r = await fetch('/api/git/pull', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ remote, branch })}); if (!r.ok) throw new Error(await r.text()); return r.text() }
export async function gitInit() { const r = await fetch('/api/git/init', { method:'POST' }); if (!r.ok) throw new Error(await r.text()); return r.json() }

export async function importClone(repo: string, dir?: string) { const r = await fetch('/api/import/clone', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ repo, dir })}); if (!r.ok) throw new Error(await r.text()); return r.text() }

export async function createPullRequest(token: string, payload: { owner: string; repo: string; title: string; head: string; base?: string; body?: string }) {
	const r = await fetch('/api/github/create-pr', { method:'POST', headers:{ 'Content-Type':'application/json', 'x-github-token': token }, body: JSON.stringify(payload) })
	if (!r.ok) throw new Error(await r.text())
	return r.json()
}