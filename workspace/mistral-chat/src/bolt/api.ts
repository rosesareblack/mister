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