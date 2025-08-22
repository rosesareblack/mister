import { create } from 'zustand'

export type Theme = 'dark' | 'light'

interface SettingsState {
	apiKey: string
	model: string
	temperature: number
	system: string
	theme: Theme
	githubToken?: string
	update: (partial: Partial<Omit<SettingsState, 'update'>>) => void
}

const STORAGE_KEY = 'mistral-settings:v1'

function load(): Omit<SettingsState, 'update'> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (raw) return JSON.parse(raw)
	} catch {}
	return {
		apiKey: '',
		model: 'mistral-large-latest',
		temperature: 0.7,
		system: '',
		theme: 'dark',
		githubToken: '',
	}
}

function save(state: Omit<SettingsState, 'update'>) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	} catch {}
}

export const useSettings = create<SettingsState>((set, get) => ({
	...load(),
	update: (partial) => set((s) => {
		const next = { ...s, ...partial }
		save({ apiKey: next.apiKey, model: next.model, temperature: next.temperature, system: next.system, theme: next.theme, githubToken: next.githubToken })
		if (partial.theme) {
			document.documentElement.dataset.theme = partial.theme
		}
		return next
	}),
}))