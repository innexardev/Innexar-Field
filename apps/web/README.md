# FieldForge Web App

Next.js 15 app for the FieldForge workspace (`app.fieldforge.com`). Includes the `/m/*` PWA routes for field crews.

## Development

```bash
# From repo root
npm run dev:web

# Or from this directory
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). API defaults to `http://localhost:8080/api/v1` via `NEXT_PUBLIC_API_URL`.

## Mobile (Capacitor)

Native iOS/Android shells wrap the same Next.js UI. `capacitor.config.ts` loads `appId`, `appName`, and iOS URL scheme from `@fieldforge/config` brand (`config/app.config.yaml`). Native projects live under `ios/` and `android/` after `cap add`.

### Prerequisites

- Node 20+
- Xcode (iOS) and/or Android Studio (Android)
- API reachable from the device or emulator (use your LAN IP for `NEXT_PUBLIC_API_URL` when testing on hardware)

### Scripts

| Script | Description |
|--------|-------------|
| `npm run cap:sync` | Copy web assets and update native projects |
| `npm run cap:add:ios` | Scaffold iOS project (once, macOS + Xcode) |
| `npm run cap:add:android` | Scaffold Android project (once) |
| `npm run cap:open:ios` | Open the iOS project in Xcode |
| `npm run cap:open:android` | Open the Android project in Android Studio |
| `npm run mobile:build` | Production web build + `cap sync` |
| `npm run mobile:init` | Add iOS + Android projects and sync (first-time) |

### Platform adapter

Use `@fieldforge/platform` to branch on native vs browser and online status:

```tsx
import { usePlatform } from "@fieldforge/platform";

function StatusBar() {
  const { isNative, isOnline } = usePlatform();
  if (isNative && !isOnline) return <OfflineBanner />;
  return null;
}
```

`isNative` is `true` inside the Capacitor WebView; `isOnline` tracks `navigator.onLine` with event listeners.

### Deep links

`@fieldforge/platform` exposes `parseDeepLink` and `useDeepLink` for universal/app links targeting `brand.domains.app` with path prefix `/m`. Native `App.addListener('appUrlOpen')` wiring is stubbed until store builds ship.

### First-time native setup

```bash
cd apps/web
npm run build          # or mobile:build once static export is configured
npm run cap:add:android   # once
npm run cap:add:ios       # once (macOS)
npm run cap:sync
npm run cap:open:ios   # or cap:open:android
```

> **Note:** Capacitor expects a static `out/` directory (`webDir` in `capacitor.config.ts`). Configure `output: "export"` in `next.config.ts` when you are ready to ship mobile builds; until then, use the PWA at `/m/*` in the browser.

## Learn more

- [Next.js docs](https://nextjs.org/docs)
- [Capacitor docs](https://capacitorjs.com/docs)
