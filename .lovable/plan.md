## Fix: "Complete profile" button not working

### Investigation approach

Reproduce the flow headlessly (Playwright against `localhost:8080`) to capture the actual failure:
1. Open the account sheet → enter a phone → submit.
2. Fill name, plate `73W-15376`, engine CC `1500`, both checkboxes.
3. Click "အတည်ပြု · Complete profile" and log every network response for `/profiles`, `/_serverFn/`, and any Supabase request, plus `pageerror`/`console.error`.

### Suspected root cause (to confirm at repro)

`completeProfile` in `src/lib/fuel/session.tsx` does:

```ts
supabase.from("profiles").insert({...}).select("...").single()
```

The `profiles` table has RLS policies:
- INSERT allowed for anon.
- SELECT denied for anon/authenticated (`Deny direct profile reads`).

The INSERT succeeds, but PostgREST cannot return the row (SELECT denied), so `.single()` yields `insertErr` and `inserted` stays `null`. The code then falls back to `getProfileByPhoneFn` → `updateProfileByPhoneFn`. If either server function call fails (e.g. because the admin RPC or client bundling breaks in preview), `full` stays `null`, the sheet never closes, and the button appears dead.

The direct insert path can never succeed by design — the deny-SELECT policy is intentional — so relying on it as the primary path is the bug.

### Fix

Rewrite `completeProfile` in `src/lib/fuel/session.tsx` to skip the RLS-blocked read-back entirely:

1. Do the anon `insert` **without** `.select().single()` (or check only for a real insert error, ignoring the empty returning). If the error is a duplicate-phone conflict, proceed to update.
2. Read the row back via the existing server function `getProfileByPhoneFn` (admin RPC, bypasses the SELECT deny).
3. If the returned row's fields differ from what the user just submitted (i.e. this is a pre-existing profile for the same phone that we're overwriting), call `updateProfileByPhoneFn` and use its result. Otherwise use the freshly inserted row as-is.
4. Surface any real error to the user in the sheet (not just `console.error`) so a future breakage is visible instead of a silent no-op.

Also add a `try/catch` around the whole flow with a user-visible error state on the profile form, and keep `console.error` for diagnostics.

### Files touched

- `src/lib/fuel/session.tsx` — rewrite `completeProfile`, add error propagation.
- `src/components/fuel/AccountSheet.tsx` — display the propagated error under the submit button (small text, red).

### Out of scope

No schema/RLS changes, no other flows (phone step, updateProfile, sign-out) touched.
