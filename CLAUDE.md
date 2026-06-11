# Marco App — Conventions

Marco is a React Native app for AI-coached padel training. Follow these rules strictly when modifying this repo.

## Stack
- Expo SDK 54
- Expo Router v6 (file-based routing, typed routes)
- TypeScript strict mode (`strict: true`, `noUncheckedIndexedAccess: true`)
- NativeWind v4 (Tailwind for React Native)
- React Query v5 (`@tanstack/react-query`)
- Zustand v5
- Axios for HTTP, Expo SecureStore for token storage

## Routing
- File-based routing via Expo Router. All routes live under `app/`.
- Route groups:
  - `app/(auth)/` — unauthenticated screens (login, onboarding).
  - `app/(tabs)/` — main authenticated app with bottom tabs.
- Route groups are routeless: do **not** add `index.tsx` inside `(auth)` or `(tabs)`.
- Auth gating happens in `app/_layout.tsx` based on `useAuthStore().isAuthenticated`.
- Never import or use `@react-navigation/*` directly. Use Expo Router's `Stack`, `Tabs`, `useRouter`, `Link`, `useSegments`.

## Styling
- Two patterns coexist in this codebase; **match the style of the file you are editing**:
  - Most screens (`app/**`) use inline `style={{ … }}` objects, often with a local `const styles = { … } as const` at the bottom of the file.
  - Some shared components (`src/components/**`) use NativeWind `className` with the Marco brand scale (50–900) from `tailwind.config.js`.
- Do not convert a file between patterns as a side effect of an unrelated change.
- No `StyleSheet.create` in new code (one legacy usage remains in `src/components/chat/MessageActionSheet.tsx`).
- Prefer color constants from `src/constants/colors.ts` over introducing new hardcoded hex values.

## Data fetching
- React Query owns all server state. Every API-backed value flows through a query or mutation hook in `src/hooks/`.
- Query keys are stable tuples exported from the hook file (e.g. `userQueryKey`, `lessonsQueryKey`).
- Zustand is for **client** state only: auth token/user, ephemeral UI state, feature toggles. Never put server data in Zustand.
- Never use `useState` to hold data that came from an API. If it's server data, it lives in React Query.

## API calls
- All HTTP goes through the Axios instance in `src/api/client.ts`. It attaches the bearer token, refreshes on 401 (rotating refresh tokens), and signs out centrally when refresh fails. In production builds it refuses a non-`https://` `EXPO_PUBLIC_API_URL`.
- Per-resource modules in `src/api/` (e.g. `users.ts`, `lessons.ts`) wrap the client and return typed responses.
- Never call `fetch()` directly. Never instantiate a second Axios client.
- Two deliberate exceptions exist — do not copy them elsewhere:
  - `src/stores/authStore.ts` uses bare `fetch` once at bootstrap (importing `client.ts` there would be a circular import).
  - `src/api/chat.ts` uses `XMLHttpRequest` because React Native's `fetch` cannot stream the SSE chat response. It clears auth itself on 401 since it bypasses the Axios interceptor.

## Types
- All API response and request types live in `src/types/api.ts`.
- Write the type **before** the component that consumes it.
- Field names mirror the Go backend exactly — `snake_case` (e.g. `avatar_url`, `created_at`, `progress_percent`). Do not rename or camelCase at the type boundary.
- No `any`. Use `unknown` + narrowing if a payload is genuinely untyped.

## Components
- One component per file. Filename matches the component name in PascalCase (`Button.tsx` exports `Button`).
- Named exports for components, hooks, and utilities. Screens under `app/**` use `export default` because Expo Router requires it — but the default export must be a **named** function, never an anonymous arrow:
  - ✅ `export default function LoginScreen() { … }`
  - ❌ `export default () => { … }`
- Props typed as `type FooProps = { … }`, not `interface`.
- Prefer `Pressable` over `TouchableOpacity`.

## Error handling
- All React Query errors surface through the shared `ErrorBanner` component in `src/components/ui/ErrorBanner.tsx`. Mutations and queries that can fail visibly should render `<ErrorBanner error={query.error} />` or feed into a global banner slot.
- `console.log` / `console.error` alone is not error handling. The user must see the failure.

## Marco token grammar

- All parsing/stripping of Marco's inline tokens (`[LESSON_REF: …]`, `[MATCH_LOG: …]`, `[MATCH_PREP: …]`) lives in `src/components/chat/marcoTokens.ts` — never write a token regex anywhere else.
- `src/components/chat/token_fixtures.json` is the shared grammar contract. An IDENTICAL copy lives in the marco-api repo at `internal/marco/testdata/token_fixtures.json`, and both repos' test suites run their parsers against it. Changing the grammar means updating marco-api's `internal/marco/prompt.md`, the fixture file in BOTH repos, and both implementations in the same change — CI on either side fails if they drift.

## Images & video
- Images: use `expo-image` (`<Image />` from `expo-image`). Never `Image` from `react-native`.
- Video: use `expo-video` (`useVideoPlayer` + `<VideoView />`). Never `expo-av` (deprecated, removed from this codebase), the bare RN video shim, or a third-party player.

## Brand colors
- Teal `#0F4C5C` — primary surfaces, headings (`bg-marco-teal`, `text-marco-teal-700`).
- Orange `#E36414` — accents and CTAs (`bg-marco-orange`, `text-marco-orange`).
- Off-white `#FAF8F5` — app background.
- Full 50–900 Tailwind scale exposed for teal and orange in `tailwind.config.js`.

## Path aliases
- `@/` maps to `src/` (see `tsconfig.json`).
- Always import via `@/…`. Never `../../…`. A single `./Sibling` is fine for files in the same folder; anything that climbs more than one level must use `@/`.

## What NOT to do
- ❌ Redux, MobX, Recoil, or any other state library besides Zustand + React Query.
- ❌ `@react-navigation/*` imported directly — go through Expo Router.
- ❌ `StyleSheet.create` in new code.
- ❌ `fetch()` — use the Axios client (two documented exceptions in "API calls" above).
- ❌ Relative imports that climb more than one level (`../../foo`). Use `@/foo`.
- ❌ `any`, `as any`, or untyped API responses.
- ❌ `useState` for server data.
- ❌ Anonymous default exports (`export default () => …`).
- ❌ `index.tsx` inside `(auth)` or `(tabs)` route groups.
- ❌ `Image` from `react-native` or third-party video players.
