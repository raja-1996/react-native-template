# Implementation Plan

Minimal template showcasing Supabase + React Native (Expo) capabilities.

## Feature Overview

| # | Feature | Priority | Layer |
|---|---------|----------|-------|
| 1 | Email signup & login | P0 | Auth |
| 2 | Logout | P0 | Auth |
| 3 | Delete account | P0 | Auth |
| 4 | Notes CRUD | P0 | Data |
| 5 | Phone OTP login | P1 | Auth |
| 6 | Image upload (avatar + gallery) | P1 | Storage |
| 7 | Realtime playground | P1 | Realtime |
| 8 | Push notifications | P1 | Notifications |

---

## Phase 1 — Foundation (Backend + DB + Auth)

### 1.1 Supabase Migrations

**File**: `supabase/migrations/001_initial_schema.sql`

```sql
-- profiles (auto-created on signup via trigger)
CREATE TABLE profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  full_name  TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- notes (simple CRUD entity)
CREATE TABLE notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  content    TEXT DEFAULT '',
  image_path TEXT,
  is_done    BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- profiles: read all, update own
CREATE POLICY profiles_select ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- notes: full CRUD, own only
CREATE POLICY notes_select ON notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notes_insert ON notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY notes_update ON notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY notes_delete ON notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- indexes
CREATE INDEX idx_notes_user ON notes(user_id, created_at DESC);

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- enable realtime on notes
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
```

### 1.2 Supabase Config

**File**: `supabase/config.toml`

- Email auth enabled, phone auth enabled
- Email confirmations disabled (dev convenience)
- Storage: 50 MiB file limit
- Realtime enabled

### 1.3 Backend — Core

**Files to create:**

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI app, CORS, health, mount v1 router
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py          # Settings (pydantic-settings)
│   │   ├── auth.py            # get_current_user dependency
│   │   └── supabase.py        # get_supabase(), get_user_supabase(token)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── auth.py            # LoginRequest, SignUpRequest, AuthResponse, OTPRequest
│   │   ├── notes.py           # NoteCreate, NoteUpdate, NoteResponse
│   │   └── storage.py         # UploadResponse, DownloadResponse
│   └── api/v1/
│       ├── __init__.py
│       ├── router.py          # Aggregates auth, notes, storage
│       ├── auth.py            # signup, login, phone_otp, verify_otp, refresh, logout, delete_account
│       ├── notes.py           # CRUD for notes
│       └── storage.py         # upload, download, delete
├── pyproject.toml
├── Dockerfile
└── .env.example
```

### 1.4 Backend — Auth Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/auth/signup` | POST | — | Email/password signup |
| `/api/v1/auth/login` | POST | — | Email/password login |
| `/api/v1/auth/phone/send-otp` | POST | — | Send OTP to phone number |
| `/api/v1/auth/phone/verify-otp` | POST | — | Verify OTP, return tokens |
| `/api/v1/auth/refresh` | POST | — | Refresh access token |
| `/api/v1/auth/logout` | POST | Bearer | Invalidate session |
| `/api/v1/auth/account` | DELETE | Bearer | Delete user account |

### 1.5 Backend — Notes Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/notes` | GET | Bearer | List user's notes |
| `/api/v1/notes` | POST | Bearer | Create note |
| `/api/v1/notes/{id}` | GET | Bearer | Get single note |
| `/api/v1/notes/{id}` | PATCH | Bearer | Update note (title, content, is_done, image_path) |
| `/api/v1/notes/{id}` | DELETE | Bearer | Delete note |

### 1.6 Backend — Storage Endpoints

(Already documented — upload, download, delete)

---

## Phase 2 — Frontend Foundation

### 2.1 Project Setup

**File**: `app/package.json`

Key dependencies:
- `expo` ~55, `react` 19, `react-native` 0.83
- `expo-router`, `expo-secure-store`, `expo-image-picker`, `expo-image`
- `@supabase/supabase-js`, `axios`, `zustand`, `@tanstack/react-query`
- `expo-notifications`, `expo-device`
- `react-native-reanimated`, `react-native-safe-area-context`

### 2.2 Lib Layer

```
app/src/lib/
├── api.ts              # Axios instance + auth interceptor + token refresh
├── query-client.ts     # TanStack Query client config
└── supabase.ts         # Supabase JS client (realtime only)
```

### 2.3 Constants

```
app/src/constants/
└── theme.ts            # Colors (light/dark), spacing, typography
```

### 2.4 Components

```
app/src/components/
├── themed-text.tsx     # Theme-aware Text
├── themed-view.tsx     # Theme-aware View
├── button.tsx          # Styled pressable button
├── input.tsx           # Styled TextInput with label + error
└── note-card.tsx       # Note list item (swipe to delete optional)
```

---

## Phase 3 — Auth Screens

### 3.1 Auth Store (`stores/auth-store.ts`)

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  restoreSession: () => Promise<void>;
}
```

- Tokens stored/retrieved via `expo-secure-store`
- `restoreSession()` on app launch
- All auth methods call backend API via Axios

### 3.2 Screens

```
app/src/app/
├── _layout.tsx                  # Root: QueryClientProvider, auth restore
├── index.tsx                    # Redirect based on auth state
├── (auth)/
│   ├── _layout.tsx              # Stack navigator, no header
│   ├── login.tsx                # Email + password form, link to signup, link to phone login
│   ├── signup.tsx               # Email + password form
│   └── phone-login.tsx          # Phone number input → OTP verification
└── (app)/
    ├── _layout.tsx              # Bottom tabs: Notes, Realtime, Settings
    ├── notes.tsx                # Notes list + FAB to create
    ├── note-detail.tsx          # Create/edit note (title, content, image)
    ├── realtime.tsx             # Realtime playground
    └── settings.tsx             # Profile, avatar, logout, delete account
```

### 3.3 Login Screen
- Email + password fields with validation
- "Sign Up" link → signup screen
- "Login with Phone" link → phone-login screen
- Error display for invalid credentials

### 3.4 Signup Screen
- Email + password + confirm password
- Validation (email format, password length >= 6)
- Auto-login after successful signup

### 3.5 Phone Login Screen
- Step 1: Enter phone number → "Send OTP" button
- Step 2: Enter 6-digit OTP → "Verify" button
- Auto-login after successful verification

---

## Phase 4 — Notes CRUD

### 4.1 Service Layer (`services/notes-service.ts`)

```typescript
const notesService = {
  list: () => api.get<Note[]>('/notes'),
  get: (id: string) => api.get<Note>(`/notes/${id}`),
  create: (data: NoteCreate) => api.post<Note>('/notes', data),
  update: (id: string, data: NoteUpdate) => api.patch<Note>(`/notes/${id}`, data),
  delete: (id: string) => api.delete(`/notes/${id}`),
};
```

### 4.2 TanStack Query Hooks (`hooks/use-notes.ts`)

```typescript
useNotes()           // queryKey: ['notes']
useNote(id)          // queryKey: ['notes', id]
useCreateNote()      // invalidates ['notes']
useUpdateNote()      // invalidates ['notes']
useDeleteNote()      // invalidates ['notes']
```

### 4.3 Notes List Screen
- FlatList with pull-to-refresh
- Each note shows title, preview of content, done status, timestamp
- Tap → navigate to note-detail
- FAB (floating action button) → create new note
- Swipe-to-delete or long-press menu

### 4.4 Note Detail Screen
- Title input, multiline content input
- Toggle "done" status
- Image attachment (pick from gallery via expo-image-picker)
- Save / Delete buttons

---

## Phase 5 — Image Upload

### 5.1 Storage Service (`services/storage-service.ts`)

```typescript
const storageService = {
  upload: (file: FormData) => api.post('/storage/upload', file, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getUrl: (path: string) => api.get(`/storage/download/${path}`),
  delete: (path: string) => api.delete(`/storage/delete/${path}`),
};
```

### 5.2 Avatar Upload (Settings Screen)
- Tap avatar → expo-image-picker (camera or gallery)
- Upload to storage → update profile `avatar_url`
- Display with `expo-image` (cached)

### 5.3 Note Image Attachment
- "Attach Image" button in note-detail
- Pick image → upload → save `image_path` on note
- Display image in note detail and as thumbnail in list

---

## Phase 6 — Realtime Playground

### 6.1 Screen: `realtime.tsx`

A dedicated screen demonstrating Supabase Realtime features:

1. **Live Notes Feed** — subscribe to `postgres_changes` on `notes` table, show inserts/updates/deletes in real-time log
2. **Presence** — show online users count using Supabase `presence` channel
3. **Broadcast Counter** — shared counter that any user can increment, broadcast to all via `broadcast` channel

```typescript
// postgres_changes subscription
supabase.channel('notes-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, payload => {
    addToLog(`${payload.eventType}: ${payload.new?.title || payload.old?.id}`);
  })
  .subscribe();

// presence
channel.on('presence', { event: 'sync' }, () => {
  setOnlineCount(Object.keys(channel.presenceState()).length);
});

// broadcast
channel.on('broadcast', { event: 'counter' }, ({ payload }) => {
  setCounter(payload.value);
});
```

UI: Three cards/sections showing each feature with live-updating data.

---

## Phase 7 — Push Notifications

### 7.1 Backend

**New endpoint**: `POST /api/v1/notifications/register-token`
- Saves Expo push token to `profiles.push_token` column
- New migration adds `push_token TEXT` to profiles

**Utility**: `send_push_notification(token, title, body)` using Expo Push API (`https://exp.host/--/api/v2/push/send`)

### 7.2 Frontend

**File**: `lib/notifications.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

async function registerForPushNotifications() {
  if (!Device.isDevice) return null;  // Push doesn't work on simulators
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;
  const token = await Notifications.getExpoPushTokenAsync();
  await api.post('/notifications/register-token', { token: token.data });
  return token.data;
}
```

- Call `registerForPushNotifications()` after login
- Handle incoming notifications with `Notifications.addNotificationReceivedListener`
- Settings screen shows notification permission status

---

## Phase 8 — Polish

### 8.1 Navigation
- Bottom tabs: **Notes** | **Realtime** | **Settings**
- Tab icons (Expo vector icons or simple emoji fallback)

### 8.2 Settings Screen
- User email display
- Avatar with upload
- Push notification status
- Logout button (with confirmation)
- Delete Account button (with confirmation + text input "DELETE")

### 8.3 Error Handling
- Toast/alert for API errors
- Form validation messages inline
- Loading states on all async actions

---

## File Count Estimate

| Layer | Files | Description |
|-------|-------|-------------|
| Supabase | 2 | Migration + config |
| Backend | 12 | Core, schemas, routes, main |
| Frontend | ~20 | Screens, components, hooks, stores, services, lib, constants |
| Config | 4 | package.json, tsconfig, app.json, .env.example |
| **Total** | **~38** | Minimal but complete |

---

## Implementation Order

1. **Supabase** — migrations + config
2. **Backend core** — config, auth dep, supabase factory
3. **Backend auth** — signup, login, phone OTP, logout, delete
4. **Backend notes** — CRUD endpoints
5. **Backend storage** — upload/download/delete
6. **Frontend foundation** — package.json, lib layer, theme, components
7. **Auth store + screens** — login, signup, phone login
8. **Notes screens** — list + detail with CRUD
9. **Image upload** — avatar + note attachments
10. **Realtime playground** — live demo screen
11. **Push notifications** — registration + handling
12. **Settings screen** — profile, logout, delete account
