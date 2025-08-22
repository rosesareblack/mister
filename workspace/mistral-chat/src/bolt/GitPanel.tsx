import { useEffect, useState } from 'react'
import { gitStatus, gitDiff, gitStage, gitUnstage, gitCommit, gitPush, gitPull } from './api'
import { useSettings } from '../store/settings'
import { createPullRequest } from './api'

export function GitPanel() {
	const [status, setStatus] = useState('')
	const [diff, setDiff] = useState('')
	const [message, setMessage] = useState('')
	const settings = useSettings()

	async function refresh() {
		const s = await gitStatus()
		setStatus(s.text)
		const d = await gitDiff()
		setDiff(d)
	}

	useEffect(() => { refresh().catch(()=>{}) }, [])

	async function stageAll() {
		const lines = status.split('\n')
		const paths = lines.map(l => l.trim().split(' ').pop()).filter(Boolean) as string[]
		if (paths.length) await gitStage(paths)
		await refresh()
	}
	async function unstageAll() {
		const lines = status.split('\n')
		const paths = lines.map(l => l.trim().split(' ').pop()).filter(Boolean) as string[]
		if (paths.length) await gitUnstage(paths)
		await refresh()
	}
	async function commit() { if (!message.trim()) return; await gitCommit(message); setMessage(''); await refresh() }
	async function push() { await gitPush('origin'); await refresh() }
	async function pull() { await gitPull('origin'); await refresh() }
	async function openPR() {
		const token = settings.githubToken || ''
		if (!token) return alert('Set GitHub token in Settings')
		const owner = prompt('Owner (org/user)') || ''
		const repo = prompt('Repo name') || ''
		const title = prompt('PR title') || ''
		const head = prompt('Head branch') || ''
		if (!owner || !repo || !title || !head) return
		const pr = await createPullRequest(token, { owner, repo, title, head })
		alert(`PR created: #${pr.number}`)
	}

	return (
		<div className="h-full grid grid-rows-[auto_auto_1fr]">
			<div className="border-b border-zinc-800 p-2 text-xs text-zinc-400">Git Status</div>
			<pre className="max-h-40 overflow-auto text-xs p-3 whitespace-pre-wrap">{status || '—'}</pre>
			<div className="border-t border-zinc-800 grid grid-rows-[auto_1fr_auto]">
				<div className="flex items-center gap-2 p-2 border-b border-zinc-800">
					<button onClick={stageAll} className="text-xs px-2 py-1 rounded border border-zinc-800 hover:bg-zinc-900">Stage all</button>
					<button onClick={unstageAll} className="text-xs px-2 py-1 rounded border border-zinc-800 hover:bg-zinc-900">Unstage all</button>
					<input value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Commit message" className="flex-1 bg-transparent text-xs text-zinc-400 border border-zinc-800 rounded px-2 py-1" />
					<button onClick={commit} className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Commit</button>
					<button onClick={push} className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Push</button>
					<button onClick={pull} className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Pull</button>
					<button onClick={openPR} className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700">Create PR</button>
				</div>
				<pre className="overflow-auto text-xs p-3 whitespace-pre">{diff || '—'}</pre>
				<div />
			</div>
		</div>
	)
}