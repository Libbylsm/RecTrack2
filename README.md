# Receipt Roulette 🎰🧾🏙️

Snap your receipts → an AI vision model reads every line → your spending grows a virtual city.
Impulse buys build factories and smog; essentials and savings plant trees.

- `app/`: Expo (React Native) iPhone app, run in Expo Go
- `server/`: Node + Express server that calls free vision models on OpenRouter (structured JSON, validated with zod). It keeps the API key off the phone.

## Run it

1. **Server** (laptop):
   ```bash
   cd server
   cp .env.example .env      # paste your OPENROUTER_API_KEY into .env
   npm run dev               # listens on :3001
   ```
2. **App** (laptop + iPhone on the **same Wi-Fi**):
   ```bash
   cd app
   npx expo start
   ```
   Scan the QR code with the iPhone camera to open it in Expo Go.

The app finds the server on your laptop's LAN IP automatically (port 3001). The address is shown at the bottom of the Scan tab.
If the Wi-Fi blocks devices from talking to each other (common at venues), use a phone hotspot, or tunnel both:
`npx expo start --tunnel`, expose the server with e.g. `ngrok http 3001`, and set `EXPO_PUBLIC_API_URL=https://…` in `app/.env`.

## Demo safety net
- **Load 5 demo receipts** (Scan tab) fills the city without a camera or network.
- If the AI analyst can't be reached, the Insights tab offers demo insights.

## How it works
| Step | Where |
|---|---|
| Photo → base64 JPEG | `app/src/screens/ScanScreen.tsx` |
| Receipt image → structured items (category + necessity) | `POST /api/receipt`, `server/src/index.ts` |
| All receipts → personality, patterns, savings tips, persona comparison, mayor's report | `POST /api/insights` |
| Items → districts, buildings, factories, smog, trees, air quality | `app/src/city.ts` |
