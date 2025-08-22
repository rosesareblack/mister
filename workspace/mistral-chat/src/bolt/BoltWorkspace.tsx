import { useEffect, useState } from 'react'
import Editor from '@monaco-editor/react'
import type { FsItem } from './api'
import { fsList, fsRead, fsWrite, execStream, fsMkdir, fsDelete, searchProject, listScripts, importClone } from './api'
import { Play, Save, FolderPlus, Trash2, Search, Eye, GitBranch, Download } from 'lucide-react'
import { AiActions } from './AiActions'
import { GitPanel } from './GitPanel'

function Tree({ cwd, onOpen, onMkdir, onDelete }: { cwd: string, onOpen: (path: string) => void, onMkdir: () => void, onDelete: (p: string) => void }) {
	const [items, setItems] = useState<FsItem[]>([])
	useEffect(() => {
		fsList(cwd).then((r) => setItems(r.items))
	}, [cwd])
	return (
		<div className="text-sm">
			{items.map((it) => (
				<div key={it.path} className="px-2 py-1 hover:bg-zinc-800/50 flex items-center">
					<div onClick={() => onOpen(it.path)} className="flex-1 cursor-pointer">
						<span className="text-zinc-400">{it.type === 'dir' ? '📁' : '📄'}</span>
						<span className="ml-2">{it.name}</span>
					</div>
					<button onClick={() => onDelete(it.path)} className="text-zinc-500 hover:text-red-400"><Trash2 size={14} /></button>
				</div>
			))}
			<div className="p-2">
				<button onClick={onMkdir} className="w-full inline-flex items-center gap-2 text-xs px-2 py-1 rounded border border-zinc-800 hover:bg-zinc-900"><FolderPlus size={14}/> New folder</button>
			</div>
		</div>
	)
}

export function BoltWorkspace() {
	const [openedPath, setOpenedPath] = useState<string>('src/App.tsx')
	const [code, setCode] = useState<string>('')
	const [cwd, setCwd] = useState<string>('.')
	const [terminalOutput, setTerminalOutput] = useState<string>('')
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<{ path: string; line: number; column: number; preview: string }[]>([])
	const [scripts, setScripts] = useState<Record<string,string>>({})
	const [showPreview, setShowPreview] = useState(false)
	const [tab, setTab] = useState<'editor' | 'git' | 'import'>('editor')
	const [cloneRepo, setCloneRepo] = useState('')
	const [cloneDir, setCloneDir] = useState('')

	useEffect(() => { listScripts().then(r=> setScripts(r.scripts)).catch(()=>{}) }, [])

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

	async function mkdir() {
		const name = prompt('Folder name relative to current cwd')
		if (!name) return
		await fsMkdir(name)
	}

	async function del(p: string) {
		if (!confirm(`Delete ${p}?`)) return
		await fsDelete(p)
		if (openedPath === p) setOpenedPath('')
	}

	async function search() {
		if (!query.trim()) return
		const r = await searchProject(query)
		setResults(r.results)
	}

	async function clone() {
		if (!cloneRepo.trim()) return
		await importClone(cloneRepo, cloneDir || undefined)
		alert('Cloned')
	}

	return (
		<div className="h-full grid grid-cols-[260px_1fr]">
			<aside className="border-r border-zinc-800 overflow-y-auto">
				<div className="p-2 border-b border-zinc-800 text-xs text-zinc-400">workspace</div>
				<Tree cwd={cwd} onOpen={(p)=> setOpenedPath(p)} onMkdir={mkdir} onDelete={del} />
				<div className="p-2 border-t border-zinc-800 space-y-2">
					<div className="text-xs text-zinc-400">Scripts</div>
					<div className="space-y-1">
						{Object.entries(scripts).map(([k,v]) => (
							<button key={k} onClick={()=> run(`npm run ${k}`)} className="w-full text-left text-xs px-2 py-1 rounded border border-zinc-800 hover:bg-zinc-900">{k} — <span className="text-zinc-500">{v}</span></button>
						))}
					</div>
				</div>
			</aside>
			<section className="grid grid-rows-[auto_auto_1fr_200px]">
				<div className="h-10 border-b border-zinc-800 flex items-center gap-2 px-3">
					<input value={cwd} onChange={(e)=>setCwd(e.target.value)} className="bg-transparent text-xs text-zinc-400 border border-zinc-800 rounded px-2 py-1" />
					<div className="ml-auto flex items-center gap-2">
						<button onClick={()=>setShowPreview(v=>!v)} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"><Eye size={14}/> {showPreview ? 'Hide' : 'Preview'}</button>
						<button onClick={() => run('npm run build')} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"><Play size={14}/> build</button>
						<button onClick={() => run('npm run dev')} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"><Play size={14}/> dev</button>
					</div>
				</div>
				<div className="h-10 border-b border-zinc-800 flex items-center gap-2 px-3 text-xs">
					<button onClick={()=>setTab('editor')} className={"px-2 py-1 rounded " + (tab==='editor' ? 'bg-zinc-800' : 'hover:bg-zinc-900')}><Save size={12} className="inline mr-1"/> Editor</button>
					<button onClick={()=>setTab('git')} className={"px-2 py-1 rounded " + (tab==='git' ? 'bg-zinc-800' : 'hover:bg-zinc-900')}><GitBranch size={12} className="inline mr-1"/> Git</button>
					<button onClick={()=>setTab('import')} className={"px-2 py-1 rounded " + (tab==='import' ? 'bg-zinc-800' : 'hover:bg-zinc-900')}><Download size={12} className="inline mr-1"/> Import</button>
				</div>
				{tab === 'editor' && (
					<div className="grid grid-cols-[2fr_1fr] overflow-hidden">
						<div className="flex flex-col border-r border-zinc-800">
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
						<div className="grid grid-rows-[auto_1fr]">
							<div className="h-10 border-b border-zinc-800 flex items-center gap-2 px-3">
								<input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search..." className="flex-1 bg-transparent text-xs text-zinc-400 border border-zinc-800 rounded px-2 py-1" />
								<button onClick={search} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"><Search size={14}/> Search</button>
							</div>
							<div className="overflow-auto text-xs">
								{results.map((r, i) => (
									<div key={i} className="px-3 py-2 hover:bg-zinc-800/50 cursor-pointer" onClick={()=> { setOpenedPath(r.path); }}>
										<div className="text-zinc-300">{r.path}:{r.line}</div>
										<div className="text-zinc-500">{r.preview}</div>
									</div>
								))}
							</div>
						</div>
					</div>
				)}
				{tab === 'git' && (
					<div className="overflow-hidden"><GitPanel/></div>
				)}
				{tab === 'import' && (
					<div className="p-4 space-y-3 text-sm">
						<div className="text-xs text-zinc-400">Clone a repository</div>
						<input value={cloneRepo} onChange={(e)=>setCloneRepo(e.target.value)} placeholder="https://github.com/org/repo.git" className="w-full bg-transparent text-xs text-zinc-400 border border-zinc-800 rounded px-2 py-1" />
						<input value={cloneDir} onChange={(e)=>setCloneDir(e.target.value)} placeholder="target directory (optional)" className="w-full bg-transparent text-xs text-zinc-400 border border-zinc-800 rounded px-2 py-1" />
						<button onClick={clone} className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Clone</button>
					</div>
				)}
				<div className="border-t border-zinc-800 grid grid-cols-[1fr_1fr]">
					<pre className="h-[calc(200px-0.5rem)] overflow-auto text-xs p-3 whitespace-pre-wrap border-r border-zinc-800">{terminalOutput}</pre>
					<div className="relative">
						{showPreview ? (
							<iframe src="http://localhost:5173" className="absolute inset-0 w-full h-full border-0 bg-white" />
						) : (
							<div className="h-full grid place-items-center text-xs text-zinc-500">Preview hidden</div>
						)}
					</div>
				</div>
			</section>
		</div>
	)
}