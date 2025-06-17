# Supabase Authentication & User Recordings Integration Plan

This document outlines the **step-by-step plan** to replace the local demo login with real Supabase authentication and to persist every user's audio & transcription results in Supabase (database + storage).

---

## 1. Prerequisites
1. Create a **Supabase project** → copy the Project URL & `anon` public key.
2. In the Supabase dashboard create a **bucket** named `recordings` (public = false).
3. Enable **Row Level Security** (RLS) on new tables (default in Supabase v2).

---

## 2. Install Dependencies
```bash
# at project root
npm i @supabase/supabase-js
```


---

## 3. Environment Variables
Create/extend `.env` (or `.env.local`)
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```
> ⚠️ Because the project is built with **Vite**, variables must start with `VITE_`.

---

## 4. Supabase Client Factory (`src/lib/supabase.ts`)
```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 5. Auth Context Provider (`src/contexts/AuthProvider.tsx`)
1. Wrap the whole application inside `AuthProvider` (update `main.tsx`).
2. Listen to `supabase.auth.onAuthStateChange` and keep `session` & `user` in React state.
3. Expose `{ user, session, signIn, signUp, signOut, loading }` via React Context.

### Why?
• Removes the manual `localStorage` flag now used in `App.tsx`.
• Gives other components easy access to the logged-in user.

---

## 6. Replace Demo Login with Supabase Auth
### 6.1 Component changes
- Rename current `LoginPage.tsx` to `LoginDemo.tsx` (optional backup).
- Create new `LoginPage.tsx` & `SignupPage.tsx` that:
  1. Use **React Hook Form** + **Zod** validation (per project guidelines).
  2. Call `supabase.auth.signInWithPassword()` and `supabase.auth.signUp()`.
  3. Display friendly error messages (`AuthApiError` handling).

### 6.2 Routing / Conditional Rendering
- Remove `isAuthenticated` state in `App.tsx`.
- Use `useAuth()` from context; if `user` is `null` render `<LoginPage />`.

### 6.3 Sign-out Button
- In `LeftSidebar` replace `onLogout` with `signOut()` from context.

---

## 7. Secure User Data Tables
```
-- recordings table
create table public.recordings (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        references auth.users on delete cascade,
  file_path   text        not null, -- storage bucket path
  transcript  jsonb       not null,
  created_at  timestamptz default now()
);
```
Enable RLS and add a policy:
```sql
create policy "individual access" on public.recordings
  for all using ( auth.uid() = user_id );
```

---

## 8. Upload Flow Changes (`handleFileUpload` in `App.tsx`)
1. After successful **API processing**:
   ```ts
   const user = supabase.auth.getUser().data?.user;
   if (user) {
     // 1) Upload audio to storage
     const { data: storageError } = await supabase.storage
       .from('recordings')
       .upload(`${user.id}/${file.name}`, file, { cacheControl: '3600', upsert: true });

     // 2) Insert DB row
     await supabase.from('recordings').insert({
       user_id: user.id,
       file_path: `${user.id}/${file.name}`,
       transcript: data  // the JSON returned from API
     });
   }
   ```
2. Remove the current `localStorage`-only persistence.
3. Keep the existing cache for quick re-play but treat Supabase as the source of truth.

---

## 9. Fetching User Recordings
Create **React Query** hook `useRecordings()`:
```ts
export const useRecordings = () => {
  const { user } = useAuth();
  return useQuery(['recordings', user?.id], async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  });
};
```
Display list in `LeftSidebar` so users can re-open past transcripts.

---

## 10. Storage Retrieval Helper
```ts
export const getRecordingUrl = async (path: string) => {
  const { data } = await supabase.storage.from('recordings').createSignedUrl(path, 3600);
  return data?.signedUrl;
};
```
Use this when loading a previously stored recording.

---

## 11. Security & Validation Checklist
- All tables have RLS; every query filters by `user_id`.
- Supabase storage bucket is **private** (signed URLs only).
- Form inputs sanitised with Zod.

---

## 12. Update README
Add setup instructions: env vars, Supabase project, database migration SQL.

---

## 13. Optional Enhancements (post-MVP)
- Passwordless (magic-link) login via `supabase.auth.signInWithOtp`.
- Social OAuth providers (Google, GitHub) – add in Supabase dashboard, then call `supabase.auth.signInWithOAuth`.
- Full-text search on transcripts using the `pgvector` or `fts` extension.
- Background jobs via Supabase Edge Functions for heavy audio post-processing.

---

_Once these tasks are completed the app will have production-ready authentication and each user will see **only their own** audio & transcription data persisted in Supabase._ 