import { useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import { fsList, fsRead, fsWrite, execStream, FsItem } from './api'
import { Play, Save } from 'lucide-react'
import { AiActions } from './AiActions'

function Tree({ cwd, onOpen }: { cwd: string, onOpen: (path: string) => void }) {
	const [items, setItems] = useState<FsItem[]>([])
	useEffect(() => {
		fsList(cwd).then((r) => setItems(r.items))
	}, [cwd])
	return (
		<div className="text-sm">
			{items.map((it) => (
				<div key={it.path} className="px-2 py-1 hover:bg-zinc-800/50 cursor-pointer" onClick={() => onOpen(it.type === 'dir' ? it.path : it.path)}>
					<span className="text-zinc-400">{it.type === 'dir' ? '📁' : '📄'}</span>
					<span className="ml-2">{it.name}</span>
				</div>
			))}
		</div>
	)
}

export function BoltWorkspace() {
	const [openedPath, setOpenedPath] = useState<string>('src/App.tsx')
	const [code, setCode] = useState<string>('')
	const [cwd, setCwd] = useState<string>('.')
	const [terminalOutput, setTerminalOutput] = useState<string>('')

	useEffect(() => {
		if (!openedPath) return
		fsRead(openedPath).then((r) => setCode(r.content)).catch(() => setCode(''))
	}, [openedPath])

	async function save() {
		if (!openedPath) return
		await fsWrite(openedPath, code)
	}

	async function run(cmd: string) {
		setTerminalOutput('')
		const stream = await execStream(cmd, cwd)
		for await (const chunk of stream) {
			setTerminalOutput((o) => o + chunk)
		}
	}

	return (
		<div className="h-full grid grid-cols-[260px_1fr]">
			<aside className="border-r border-zinc-800 overflow-y-auto">
				<div className="p-2 border-b border-zinc-800 text-xs text-zinc-400">workspace</div>
				<Tree cwd={cwd} onOpen={(p)=> setOpenedPath(p)} />
			</aside>
			<section className="grid grid-rows-[1fr_200px]">
				<div className="flex flex-col">
					<div className="h-10 border-b border-zinc-800 flex items-center gap-3 px-3">
						<div className="text-xs text-zinc-400 truncate">{openedPath}</div>
						<AiActions path={openedPath} code={code} onApply={(next)=> setCode(next)} />
						<button onClick={save} className="ml-auto text-zinc-400 hover:text-zinc-200" title="Save"><Save size={16}/></button>
					</div>
					<div className="flex-1">
						<Editor
							height="100%"
							defaultLanguage={openedPath.endsWith('.ts') || openedPath.endsWith('.tsx') ? 'typescript' : 'javascript'}
							path={openedPath}
							value={code}
							onChange={(v)=> setCode(v ?? '')}
							options={{ minimap: { enabled: false }, fontSize: 13, wordWrap: 'on', scrollBeyondLastLine: false }}
						/>
					</div>
				</div>
				<div className="border-t border-zinc-800">
					<div className="h-9 border-b border-zinc-800 flex items-center gap-2 px-3">
						<input value={cwd} onChange={(e)=>setCwd(e.target.value)} className="bg-transparent text-xs text-zinc-400 border border-zinc-800 rounded px-2 py-1" />
						<button onClick={()=>run('npm run build')} className="ml-auto inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"><Play size={14}/> build</button>
						<button onClick={()=>run('npm run dev')} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"><Play size={14}/> dev</button>
					</div>
					<pre className="h-[calc(200px-2.25rem)] overflow-auto text-xs p-3 whitespace-pre-wrap">{terminalOutput}</pre>
				</div>
			</section>
		</div>
	)
}