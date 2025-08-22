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