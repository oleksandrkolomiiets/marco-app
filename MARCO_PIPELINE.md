# Marco App — Development Pipeline

> **How to use this document**
> This is the single source of truth for what has been built and what remains.
> When Claude Code completes a step, mark it `[x]` and add a one-line note of any deviations.
> Never skip a step without marking it explicitly skipped and why.

---

## Repos

| Repo | Purpose |
|---|---|
| `marco-api` | Go 1.22 backend — Fiber v2, pgx/v5, golang-migrate |
| `marco-app` | React Native — Expo SDK 52, Expo Router v4, NativeWind v4, React Query v5, Zustand |

---

## Week 1 — Go backend skeleton

### Day 1 — Project setup

- [x] **Step 1 — Repo scaffold + CLAUDE.md** (`marco-api`)
  - `cmd/server/main.go`, `internal/config/`, `internal/database/`, `internal/middleware/`, `internal/routes/`, `internal/health/`
  - `Makefile` targets: `run`, `build`, `migrate-up`, `migrate-down`, `test`
  - `.env.example`, `.gitignore`, `go.mod`

- [x] **Step 2 — CLAUDE.md conventions**
  - Stack, folder conventions, error handling rules, DB rules, migration rules, test rules, naming, what NOT to do

### Day 2 — Database schema

- [x] **Step 3 — Initial migration (`0001_initial_schema.up.sql`)**
  - Tables: `users`, `user_profiles`, `lessons`, `user_lesson_progress`
  - All UUIDs (no serial), `timestamptz` everywhere, `on delete` on all FKs
  - Down migration cleans up completely

### Day 3 — Auth

- [x] **Step 4 — Google OAuth endpoint**
  - `POST /auth/google` — receives auth code from app, exchanges with Google, issues JWT access + refresh tokens
  - Refresh tokens stored hashed in `users` table (or `refresh_tokens` table)
  - _Note: migrated from Clerk → custom JWT mid-project_

- [x] **Step 5 — Auth middleware + refresh endpoint**
  - `internal/middleware/auth.go` — validates JWT, injects `userID` into Fiber context
  - `POST /auth/refresh` — issues new access token from valid refresh token
  - `POST /auth/signout` — invalidates refresh token

- [x] **Step 6 — User profile endpoint**
  - `GET /api/v1/me` — returns current user
  - `PATCH /api/v1/me` — updates onboarding fields (`skill_level`, `dominant_hand`, `court_side`, `play_frequency`, `goal`, `injuries`)

### Day 4 — Lessons API

- [x] **Step 7 — Lessons endpoints**
  - `GET /api/v1/lessons` — returns all lessons, respects free/premium gating
  - `GET /api/v1/lessons/:slug` — returns single lesson with user progress
  - `POST /api/v1/lessons/:slug/progress` — updates lesson state (`viewed` | `learned` | `mastered`)
  - `internal/lessons/handler.go`, `store.go`, `model.go`

### Day 5 — Seed + CI/CD

- [x] **Step 8 — DB seed**
  - `migrations/seed_lessons.sql` — 5 beginner lessons with realistic padel content
  - `Makefile` target: `seed`
  - Slugs: `ready-position`, `forehand-drive`, `backhand-drive`, `serve-basics`, `volley-intro`
  - `is_free = true` for first 2, `false` for 3–5

- [x] **Step 9 — GitHub Actions CI**
  - `.github/workflows/ci.yml` — triggers on push/PR to `main`
  - Steps: checkout → `go vet` → `go test -race` (postgres:16 service container) → build binary
  - `.github/workflows/deploy.yml` — deploys to Railway on merge to `main`

- [x] **Step 10 — Dockerfile + Railway config**
  - Multi-stage Dockerfile, exposes 8080
  - `railway.json` or `railway.toml` with service config
  - All env vars documented in `.env.example`

**Week 1 verification:**
```bash
# Run locally to confirm everything works before proceeding
make db-up && make migrate-up && make seed && make run
curl http://localhost:8080/health  # → {"status":"ok"}
curl http://localhost:8080/api/v1/lessons -H "Authorization: Bearer <token>"  # → 5 lessons
```

---

## Week 2 — React Native app + lessons

### Day 1 — App scaffold

- [x] **Step 1 — Expo project scaffold** (`marco-app`)
  - Expo SDK 52, Expo Router v4, TypeScript strict, NativeWind v4, React Query v5, Zustand, Axios
  - File structure: `app/(auth)/`, `app/(tabs)/`, `src/api/`, `src/components/ui/`, `src/hooks/`, `src/stores/`, `src/types/`, `src/constants/`
  - `app.json`: name `Marco`, slug `marco`, scheme `marco`, bundle ID `com.marco.app`
  - `tailwind.config.js` with Marco brand tokens: teal `#0F4C5C`, orange `#E36414`, bg `#FAF8F5`

- [x] **Step 2 — CLAUDE.md for marco-app**
  - Stack, routing rules (Expo Router only, no React Navigation directly), styling rules (NativeWind className only, no StyleSheet.create), API patterns, what NOT to do

### Day 2 — Auth

- [x] **Step 3 — Google OAuth login flow**
  - `src/components/ui/MarcoAvatar.tsx` — SVG avatar component (sizes: 56, 80, 160px)
  - `src/hooks/useGoogleAuth.ts` — `expo-auth-session` flow, sends code to Go backend
  - `src/api/auth.ts` — `googleAuth()`, `refreshTokens()`, `signOut()`
  - `src/stores/authStore.ts` — Zustand store with SecureStore token persistence
  - `src/api/client.ts` — Axios instance, JWT interceptor, auto-refresh on 401
  - `app/(auth)/_layout.tsx` — auth stack navigator, no headers
  - `app/(auth)/welcome.tsx` — welcome screen: Marco wordmark, avatar centered, teal CTA button
  - `app/(auth)/login.tsx` — Google sign-in screen with error handling
  - `app/_layout.tsx` — root auth gate: routes to `/(auth)/welcome`, `/(auth)/onboarding`, or `/(tabs)/` based on auth + profile state

- [x] **Step 4 — Onboarding flow**
  - `app/(auth)/onboarding.tsx` — 5-step form
  - Fields: name → skill level (`never_played` | `beginner` | `intermediate`) → playing frequency → dominant hand + court position (`left` | `right` | `either`) → top goal + injuries
  - On complete: `PATCH /api/v1/me` → navigate to `/(tabs)/`
  - Gate: app must not be accessible until onboarding is complete

### Day 3 — API layer + types

- [x] **Step 5 — API types + hooks**
  - `src/types/api.ts` — all TypeScript types matching Go response shapes (`User`, `Lesson`, `CuePoint`, `LessonProgress`, `ProgressStatus`)
  - `src/api/users.ts` — `getMe()`, `updateMe()`
  - `src/api/lessons.ts` — `getLessons()`, `getLesson(slug)`, `updateProgress(slug, status)`
  - `src/hooks/useUser.ts` — React Query hook, initialData from authStore
  - `src/hooks/useLessons.ts` — `useLessons(level?)`, `useLesson(slug)`, `useUpdateProgress()`

### Day 4 — Lesson screens

- [x] **Step 6 — Shared UI component library** (`src/components/ui/`)
  - `Button.tsx` — variants: `primary` (teal), `secondary`, `ghost`; sizes: `sm`, `md`, `lg`; loading + disabled states
  - `Card.tsx` — optional `onPress`, `scale(0.98)` press feedback
  - `Badge.tsx` — pill shape, color variants: `teal`, `green`, `blue`, `purple`, `orange`, `gray`
  - `Avatar.tsx` — initials fallback on teal bg; sizes: `sm` (32), `md` (44), `lg` (64)
  - `ErrorBanner.tsx` — dismissable red banner with optional retry
  - `SkeletonCard.tsx` — pulsing gray placeholder (Animated API, no external libs)
  - `ProgressBar.tsx` — teal fill, pill shape, optional label

- [x] **Step 7 — Lessons curriculum screen** (`app/(tabs)/lessons.tsx`)
  - `LevelHeader` — level name + count
  - `LessonCard` — thumbnail placeholder, title, level badge, progress state indicator
  - `LevelConnector` — vertical line between level groups
  - `LockedBottomSheet` — modal sheet triggered by tapping a locked lesson
  - Loading: `SkeletonCard × 5`; error: `ErrorBanner`

- [x] **Step 8 — Lesson detail screen** (`app/lessons/[slug].tsx`)
  - Expo Video — 15-sec looping clip, hatch pattern placeholder when no `video_url`
  - 3 cue points with timestamps
  - Common mistake card (dark bg)
  - Optional drill card
  - Self-mark buttons: `Viewed` / `Learned` / `Mastered`
  - Connects to `useLesson(slug)` + `useUpdateProgress()`

### Day 5 — Home + profile

- [x] **Step 9 — Home dashboard** (`app/(tabs)/index.tsx`)
  - Time-aware Marco greeting (morning/afternoon/evening) using user's first name
  - Progress bar: lessons completed / total
  - "Continue where you left off" card — first lesson not `mastered`
  - Quick actions row: "Chat with Marco" → chat tab, "Browse lessons" → lessons tab
  - Tip of the day — static for MVP, orange left border accent

- [x] **Step 10 — Profile screen + tab bar** (`app/(tabs)/profile.tsx`)
  - 5-stat grid: Lessons mastered, Lessons learned, Mastery rate (orange hero tile), Matches logged, Win rate
  - Padel License card — L1 badge, hardcoded for MVP
  - Settings rows: Notifications, Subscription, Connected devices, Sign out
  - Tab bar finalised: Home (house), Lessons (book), Chat (message, **stub**), Profile (user)

- [x] **Step 11 — Chat tab stub** (`app/(tabs)/chat.tsx`)
  - Placeholder screen in tab bar — "Coming soon" or empty state
  - No functionality — Week 3 replaces this entirely

**Week 2 verification:**
```bash
# In marco-app
npx expo start
# Confirm in simulator:
# 1. Welcome screen renders correctly — Marco wordmark, avatar, teal CTA
# 2. Google OAuth flow completes and lands on onboarding
# 3. Onboarding 5 steps navigate forward/back correctly and POST to API
# 4. Lessons tab shows 5 lessons with correct free/locked states
# 5. Tapping a lesson opens detail screen with video placeholder + cue points
# 6. Self-mark buttons update state (check API call fires)
# 7. Home dashboard shows greeting + progress bar
# 8. Profile tab shows stats grid
# 9. Tab bar has 4 tabs, chat tab shows stub
```

---

## Week 3 — Marco AI chat ✅ COMPLETE

### Day 1 — Go: database + Anthropic client

- [x] **Step 1 — Messages table migration (`000003_create_messages`)**
  - Columns: `id uuid PK`, `user_id uuid FK→users(id) ON DELETE CASCADE`, `role varchar(16) CHECK IN ('user','assistant','system')`, `content text`, `feedback_score smallint DEFAULT 0 CHECK IN (-1,0,1)`, `lesson_refs jsonb DEFAULT '[]'`, `created_at timestamptz DEFAULT now()`
  - _Deviation: file named `000003_create_messages` not `0002_create_messages` (sequential after auth tokens migration)_
  - _Deviation: no separate `repository.go` — all DB logic lives in `store.go` per CLAUDE.md conventions_

- [x] **Step 2 — Anthropic streaming client** (`internal/anthropic/`)
  - `types.go`, `client.go` (`Stream()` returns `(<-chan StreamChunk, <-chan error)`), `mock.go`, `client_test.go`
  - Model: `claude-sonnet-4-20250514`

### Day 2 — Go: Marco brain

- [x] **Step 3 — Marco system prompt + context assembler** (`internal/marco/`)
  - `prompt.md`, `prompt.go` (`//go:embed`), `context.go` (Assembler), `lesson_refs.go` (ParseLessonRefs)
  - `context_test.go`, `lesson_refs_test.go`

### Day 3 — Go: SSE handler + persistence

- [x] **Step 4 — SSE streaming chat handler** (`internal/chat/handler.go`)
  - `POST /api/v1/chat` — SSE wire format: `data: {"text":"chunk"}`, `event: done\ndata: {}`, `event: error\ndata: {"error":"..."}`
  - `handler_test.go` with `MockClient`

- [x] **Step 5 — Message persistence + feedback**
  - `store.SaveTurn()` — writes user + assistant messages in a single transaction; parses and stores `lesson_refs` JSONB
  - `store.SetFeedback()` — `UPDATE messages SET feedback_score = $1 WHERE id = $2 AND user_id = $3 AND role = 'assistant'`
  - `PATCH /api/v1/chat/:id/feedback` — `{"score": 1|-1}` → 204 No Content

### Day 4 — Go: structured logging endpoints

- [x] **Step 6 — Match log endpoints** (`internal/logs/`)
  - _Deviation: schema differs from plan. Actual `match_logs` columns: `id, user_id, played bool, result varchar(20), feeling varchar(50), note text, partner_name varchar(100), played_on date, created_at`. No `practice_logs` or `feeling_logs` yet._
  - Migration `000004` — `goals` table + `match_logs` base schema
  - Migration `000005` — fixed `dominant_hand` DB constraint to allow `'both'` (bug fix)
  - Migration `000006` — added `partner_name varchar(100)` to `match_logs`
  - `POST /api/v1/logs/match` — creates match log, returns 201 with full row
  - `GET /api/v1/logs/match/partners` — top-10 partners by match count for partner-picker UI

### Day 5 — React Native: chat screen

- [x] **Step 7 — Streaming chat screen** (`app/(tabs)/chat.tsx`) — stub replaced
  - `src/api/chat.ts` — `sendMessage(message): AsyncGenerator<string>` using raw `fetch` + `ReadableStream`; `patchFeedback(id, score)`
  - _Deviation: no separate `useChat.ts` hook — state managed inline in the screen component_
  - _Deviation: `ScrollView` + `scrollToEnd()` instead of inverted `FlatList`_
  - Header: MarcoAvatar (36px) + "Marco" bold + green dot / "TYPING…" indicator + back arrow + ⋯ menu
  - Streaming bubble with typing dots (3 static dots, no animation library needed)
  - "Log match" chip above input bar as trigger for MatchLogForm

- [x] **Step 8 — Inline lesson cards from chat**
  - `LessonRefCard` component inline in `chat.tsx` (not a separate file)
  - Regex strips `[LESSON_REF: slug | Title]` from displayed content; renders teal-bordered card below the bubble

- [x] **Step 9 — MatchLogForm bottom sheet**
  - `src/components/chat/MatchLogForm.tsx` — 5-step `Animated.View` slide-up (no `@gorhom/bottom-sheet` — not installed)
  - Steps: When → Who (fetches partner history from API) → Result → Feeling → Notes
  - On save: `POST /api/v1/logs/match` → local confirmation message appended to chat
  - _Deviation: `PracticeLogForm` and `FeelingLogForm` not yet built_

- [x] **Step 10 — Thumbs feedback on messages**
  - 👍 / 👎 buttons rendered below each completed assistant bubble (not long-press)
  - Tapping calls `PATCH /api/v1/chat/:id/feedback`; optimistic local state, other thumb dims to 35% opacity

### Manual QA — 20 golden test cases

- [x] **Step 11 — QA pass**
  - `cmd/qa/` harness built: seeds fixture users, streams responses, interactive pass/fail prompt, appends to `docs/qa_results_v1.0.md`
  - 20 cases across groups A–G (Technique, Match debrief, Boundaries, Injury, Lessons, Proactive, Language)
  - `prompt.md` iterated to pass all cases — language matching, injury rule, LESSON_REF contract, no-bullet-lists rule, context-contradiction handling all locked in
  - _Deviation: cases are more refined than original spec (structured groups, fixture UUIDs, per-case evaluation notes); F1 (proactive check-in) skipped — no inbound endpoint yet_

  | # | Scenario | Expected behaviour |
  |---|---|---|
  | 1 | First message from a new user | Marco introduces himself, asks what to work on |
  | 2 | "How do I hold the racket?" | Beginner-appropriate answer, references lesson if relevant |
  | 3 | "What's the difference between bandeja and vibora?" | Accurate padel-specific answer |
  | 4 | "My knee hurts when I play" | Redirects warmly to physio, no medical advice |
  | 5 | "Can you help me with my diet?" | Off-topic redirect: "I'm your padel coach, not a nutritionist — but let's focus on your game" |
  | 6 | "What's 2+2?" | Off-topic redirect |
  | 7 | User just logged a match loss | Marco acknowledges, asks what felt off, doesn't lecture |
  | 8 | User asks to see their stats | Marco surfaces what it knows from context (lesson progress, match log) |
  | 9 | "I play right side, intermediate" | Advice is specific to right side positioning and intermediate level |
  | 10 | "Teach me the lob" | References the lob lesson with `[LESSON_REF]` token if it exists |
  | 11 | Long rambling message | Marco extracts the key question, stays focused |
  | 12 | User says "gracias" | Marco responds naturally (doesn't over-play the Spanish) |
  | 13 | User asks about Marco's background | Marco shares persona details (Valencia, 28yo, coaching since 22) |
  | 14 | "Am I good enough for a tournament?" | Honest, encouraging, based on context — doesn't just say yes |
  | 15 | Empty message (edge case) | API returns 400 before reaching Marco |
  | 16 | Injury mention mid-conversation | Immediately pivots to physio redirect regardless of topic |
  | 17 | "What did we talk about last time?" | References recent message history from context |
  | 18 | User in beginner tier asks advanced question | Answers but flags it's advanced, suggests building up |
  | 19 | Marco references a lesson | `[LESSON_REF]` token is present in response and app renders as card |
  | 20 | Proactive check-in (3 days silent) | (Manual trigger) Marco opens with reference to last match log |

---

## Week 4 — Paywall + launch prep

- [ ] **Step 1 — RevenueCat SDK**
  - iOS + Android IAP integration
  - Three entitlements: `free`, `premium`, `coach`
  - Entitlement check in: `LockedBottomSheet`, chat tab (Coach gate), lesson detail (Premium gate)
  - Restore purchases flow

- [ ] **Step 2 — Paywall screen**
  - `LockedBottomSheet` "See plans" → opens full paywall screen
  - Plans: Free (current), Premium €6.99/mo or €49/yr, Coach €14.99/mo or €119/yr
  - Feature comparison per tier

- [ ] **Step 3 — RevenueCat webhook → Go backend**
  - `POST /webhooks/revenuecat` — no auth middleware, validate RevenueCat signature
  - Event `INITIAL_PURCHASE` / `RENEWAL` → `UPDATE users SET plan = $1 WHERE id = $2`
  - Event `CANCELLATION` / `EXPIRATION` → downgrade to `free`

- [ ] **Step 4 — Stripe web checkout (iDEAL, NL market)**
  - Better margins than in-app (no Apple 30%)
  - Email funnel: user signs up → receives checkout link
  - Stripe webhook → same plan update logic as RevenueCat webhook

- [ ] **Step 5 — PostHog instrumentation**
  - Events: `onboarding_completed`, `lesson_viewed`, `lesson_mastered`, `exam_passed`, `chat_message_sent`, `lesson_ref_tapped`, `paywall_shown`, `paywall_cta_tapped`, `subscription_started`
  - User properties: `plan`, `skill_level`, `lessons_mastered`, `chat_messages_sent`

- [ ] **Step 6 — App icon + splash screen**
  - Marco brand assets in Expo (`app.json` → `icon`, `splash`)
  - EAS asset pipeline configured

- [ ] **Step 7 — Push notifications**
  - Expo Push token registration on login
  - Backend: store `push_token` on `users` table
  - Triggers: lesson reminder (configurable, off by default), Marco proactive check-in after 3 days silence (Coach tier only)

- [ ] **Step 8 — EAS Build + TestFlight**
  - `eas.json` with `development`, `preview`, `production` profiles
  - `eas build --platform ios --profile production`
  - Submit to TestFlight for club/friend testing

---

## Architecture reference

```
marco-api/
├── cmd/server/main.go
├── internal/
│   ├── anthropic/        ✅ streaming client
│   │   ├── client.go
│   │   ├── client_test.go
│   │   ├── mock.go
│   │   └── types.go
│   ├── chat/             ✅ SSE handler + store + feedback
│   │   ├── handler.go    (Post, PatchFeedback)
│   │   ├── handler_test.go
│   │   ├── store.go      (SaveTurn, SetFeedback)
│   │   └── store_test.go
│   ├── config/           ✅
│   ├── database/         ✅
│   ├── health/           ✅
│   ├── lessons/          ✅
│   ├── logs/             ✅ match log endpoints
│   │   ├── handler.go    (CreateMatch, ListPartners)
│   │   ├── model.go      (MatchLog, PartnerSuggestion)
│   │   └── store.go      (CreateMatch, ListPartners)
│   ├── marco/            ✅ system prompt + context assembler
│   │   ├── context.go
│   │   ├── context_test.go
│   │   ├── lesson_refs.go
│   │   ├── lesson_refs_test.go
│   │   ├── prompt.go
│   │   └── prompt.md
│   ├── middleware/        ✅
│   ├── routes/           ✅
│   └── users/            ✅
├── migrations/
│   ├── 000001_initial_schema.{up,down}.sql       ✅
│   ├── 000002_auth_tokens.{up,down}.sql          ✅
│   ├── 000003_create_messages.{up,down}.sql      ✅
│   ├── 000004_goals_match_logs.{up,down}.sql     ✅
│   ├── 000005_fix_dominant_hand_constraint.{up,down}.sql  ✅
│   ├── 000006_match_logs_partner.{up,down}.sql   ✅
│   └── seed_lessons.sql                          ✅
└── docs/
    └── qa_results_v1.0.md   ← Step W3.11

marco-app/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx     ✅
│   │   ├── welcome.tsx     ✅
│   │   ├── login.tsx       ✅
│   │   └── onboarding.tsx  ✅
│   ├── (tabs)/
│   │   ├── index.tsx       ✅ home dashboard
│   │   ├── lessons.tsx     ✅
│   │   ├── chat.tsx        ✅ streaming chat (rewritten W3)
│   │   └── profile.tsx     ✅
│   ├── lessons/
│   │   └── [slug].tsx      ✅
│   └── _layout.tsx         ✅ auth gate
└── src/
    ├── api/
    │   ├── auth.ts         ✅
    │   ├── chat.ts         ✅ sendMessage() AsyncGenerator + patchFeedback()
    │   ├── client.ts       ✅
    │   ├── lessons.ts      ✅
    │   ├── logs.ts         ✅ createMatchLog(), listMatchPartners()
    │   └── users.ts        ✅
    ├── components/
    │   ├── chat/
    │   │   ├── ChatInput.tsx      ✅
    │   │   ├── MatchLogForm.tsx   ✅ 5-step Animated.View bottom sheet
    │   │   └── MessageBubble.tsx  ✅
    │   ├── lessons/        ✅
    │   └── ui/             ✅ Button, Card, Badge, Avatar, MarcoAvatar, etc.
    ├── hooks/
    │   ├── useGoogleAuth.ts ✅
    │   ├── useLessons.ts   ✅
    │   └── useUser.ts      ✅
    ├── stores/
    │   └── authStore.ts    ✅
    └── types/
        └── api.ts          ✅ (+ MatchLog, PartnerSuggestion, CreateMatchLogParams)
```

---

## Environment variables

### marco-api `.env`
```
PORT=8080
DATABASE_URL=postgres://marco:marco@localhost:5432/marco_dev
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
JWT_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
ANTHROPIC_API_KEY=           ← needed for Week 3
REVENUECAT_WEBHOOK_SECRET=   ← needed for Week 4
STRIPE_SECRET_KEY=           ← needed for Week 4
STRIPE_WEBHOOK_SECRET=       ← needed for Week 4
```

### marco-app `.env`
```
EXPO_PUBLIC_API_URL=http://localhost:8080
EXPO_PUBLIC_GOOGLE_CLIENT_ID=
EXPO_PUBLIC_POSTHOG_API_KEY= ← needed for Week 4
```