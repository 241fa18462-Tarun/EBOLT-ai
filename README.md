# EBOLT AI — Chatbot API Fix
website link >>>  https://241fa18462-tarun.github.io/EBOLT-ai/  ><<<<

## Why the chatbot showed `Unexpected token '<'`

The frontend was calling `/api/chat`, then trying to parse the response as JSON. On GitHub Pages, `/api/chat` is not an Express API route; the static host returns an HTML page instead. Parsing that HTML as JSON causes the error.

## Recommended: deploy the whole app to a Node.js host

This repository includes `server.ts`, which serves the API and frontend together.

1. Push this project to GitHub.
2. Create a **Web Service** on Render using the repository.
3. Build command: `npm install && npm run build`
4. Start command: `npm run dev` is for development only. For production, use `npx tsx server.ts` with `NODE_ENV=production`, or set the start command to `NODE_ENV=production npx tsx server.ts` where supported.
5. Add `GEMINI_API_KEY` in the host's environment variables. Do not put the secret in frontend code or in a `VITE_` variable.
6. Open the Render service URL. The frontend and `/api/chat` then share the same origin.

## If you keep GitHub Pages for the frontend

GitHub Pages cannot run `server.ts` or provide `/api/chat`. Deploy the backend separately to a Node.js host, then set this frontend build variable to the backend URL:

`VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com`

Rebuild and redeploy the frontend after setting it. The backend must permit requests from your frontend origin if hosted on a different domain. Do not publish your API key in GitHub Pages or in any `VITE_` variable.

## Run locally

```bash
npm install
# Add GEMINI_API_KEY to a local .env file (do not commit it).
npm run dev
```

Open the local URL shown in the terminal. The frontend now detects non-JSON API responses and shows a helpful configuration error instead of `Unexpected token '<'`.

## Note about provider configuration

This ZIP's existing server uses Gemini (`GEMINI_API_KEY`). If you intend to use OmniRoute instead, the server's provider integration must be changed to OmniRoute and configured with a server-side environment variable.
