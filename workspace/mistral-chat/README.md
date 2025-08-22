# Mistral Chat UI

A modern, open-source chat UI for Mistral that rivals Grok/ChatGPT experiences. Built with React, TypeScript, Vite, Tailwind, Zustand, and a minimal Node streaming proxy.

## Features

- Sleek chat layout with sidebar, thread, and composer
- Streaming responses with incremental rendering
- Markdown + code highlighting
- Conversation persistence (localStorage)
- Settings: API key, model, temperature, system prompt, theme
- Keyboard shortcuts: Ctrl/Cmd+N new chat, Ctrl/Cmd+, settings, Enter to send

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run dev (starts Vite and the proxy server):

```bash
npm run dev
```

By default the server reads `MISTRAL_API_KEY` from env. In dev, you can also set it in Settings in the UI; the proxy accepts `x-api-key`.

## Build

```bash
npm run build
```

Then run the server to serve the built assets:

```bash
node server/index.mjs
```

## Docker

```bash
docker build -t mistral-chat .
# Run with your key
docker run -p 8787:8787 -e MISTRAL_API_KEY=your_key mistral-chat
```

Open http://localhost:8787

## Configuration

- Environment: `MISTRAL_API_KEY` for server-side key (optional if using client-provided key)
- Models: `mistral-large-latest`, `mistral-small-latest`, `codestral-latest`

## License

MIT
