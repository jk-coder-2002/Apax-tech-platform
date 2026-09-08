# Frontend dashboard migration (Task 1B)

Wired one dashboard view - holdings and recent activity - to the real API, and this doc is the plan for the rest.

## What actually changed

**Components touched, and why:**

- [`components/portfolio-overview.tsx`](../web/components/portfolio-overview.tsx) - was reading `userHoldings.{goldGrams,silverGrams,platinumGrams}` straight out of the mock store. Now reads `useHoldingsStore()` and renders one of four states. The card markup for the success case is untouched - only the data source and the three new states around it changed.
- [`components/views/por-view.tsx`](../web/components/views/por-view.tsx) - the "Live Security Feed" was rendering `useAPAXStore().auditLogs`, a client-generated array of fake events. Now reads `useActivityStore()`. Same treatment: same feed markup, new states wrapped around it.
- [`app/dashboard/page.tsx`](../web/app/dashboard/page.tsx) - added the `fetchHoldings()`/`fetchActivity()` calls on mount (with abort-on-unmount cleanup) and the one-time session-hydration check. Removed the `setInterval` that fabricated random audit-log entries every 30s - that's precisely what `useActivityStore` now replaces. Kept the price-ticker `setInterval` (see "still mocked" below).
- [`components/app-sidebar.tsx`](../web/components/app-sidebar.tsx) - the user card and sign-out button were static (`"John Doe"`, no `onClick`). Wired to `useAuthStore` and `logoutApi`, since Task 3A's "logout clears both client store and server cookie" needed a real place to hang the click handler.
- [`components/views/dashboard-view.tsx`](../web/components/views/dashboard-view.tsx) - one line: `"Welcome back, John!"` was hardcoded and now visibly contradicted the real user name in the sidebar right below it, so it now reads from `useAuthStore`.

**Store slices, in [`lib/store.ts`](../web/lib/store.ts):**

- `useHoldingsStore` and `useActivityStore` are new, separate Zustand stores, each owning `data | isLoading | error | lastUpdated` plus a `fetch*()` action. They're deliberately not slices inside the existing `useAPAXStore` - holdings and activity now have a real network lifecycle (loading, failing, retrying) that the mock slices never needed, and mixing that into the same store as the still-mocked `vaultData`/`zakatCalculation` would have made the boundary between real and mocked state harder to see, not easier.
- `useAuthStore` is also new: `{ user, isHydrating, setUser, clearUser }`. `isHydrating` exists specifically to answer "do we know yet whether this browser has a session" without a client-side flicker - see the route-protection note below.
- `useAPAXStore` keeps `metalPrices`, `userHoldings`, `vaultData`, `zakatCalculation`, `activeView` - all still mocked, all explicitly commented as such in the file now.

## State handling

Each of `useHoldingsStore`/`useActivityStore` exposes exactly four renderable states:

1. **Loading** - `isLoading && !data`. Skeletons shaped like the real cards (`components/ui/skeleton.tsx`), not a spinner, so there's no layout shift when data arrives.
2. **Error** - `error` set. A message plus a Retry button that calls `fetch*()` again.
3. **Empty** - `data !== null && data.length === 0`. Copy invites action ("Deposit gold, silver, or platinum to start building your portfolio") rather than a bare "No data" (`components/ui/empty.tsx`).
4. **Success** - the original markup, fed real numbers.

**Race safety:** each store keeps a module-level `AbortController` (not in the reactive state - it doesn't need to trigger a re-render). Calling `fetch*()` again aborts whatever was in flight before starting the new request, and a component unmounting calls `cancel*Fetch()` in its `useEffect` cleanup. A response that arrives after its own controller was aborted is caught and dropped (`if (controller.signal.aborted) return`) rather than applied - that's what keeps a slow, stale request from clobbering a faster, newer one.

## Type strategy

`shared/types/api.ts` defines the wire contract once - `HoldingDTO`, `ActivityDTO`, `AuthUserDTO`, and the envelopes that wrap them - and both `server/` and `web/` import from it. No response shape is typed twice.

That alone isn't enough to call the types "honest" - a `fetch(...).json() as HoldingsResponse` cast would still let the server hand the frontend anything and have TypeScript believe it. So `lib/services/base.api.ts` accepts an optional `zod` schema, and every call that feeds a store (`login`, `me`, `holdings`, `activity` - see `lib/schemas/api.ts`) passes one. A response that doesn't match the schema is treated as a failure (surfaces through the same error state as a network failure), not as `data` that silently reaches a component with the wrong shape. `zod` was already a dependency here (unused, likely scaffolded for the `react-hook-form` resolvers) - no new package.

Before/after, `lib/services/base.api.ts`:

```ts
// before
const responseData = data as Partial<ApiResponse> | null

// after
const validated = options.schema.safeParse(envelope.data)
if (!validated.success) {
  throw new Error("The server returned data in an unexpected shape")
}
return { success: true, message: envelope.message ?? "Request successful", data: validated.data }
```

## Auth and route protection

Chose middleware (well - `proxy.ts`, Next 16 renamed the convention mid-cycle) over a client-side check specifically to avoid a hydration flash: it runs before any HTML is sent, so an unauthenticated `/dashboard` request never renders the dashboard shell at all, and an authenticated `/login` request never renders the login form. It's a presence check on the `token` cookie, not a signature check - the real authorization boundary stays the Express backend, which verifies the JWT on every request regardless. Worst case a stale-but-present cookie gets through the proxy: the page mounts, `getMeApi()` (or any `/api` call) 401s, and the client redirects to `/login` itself. Not a security gap, just a slightly slower rejection path.

## Still mocked, and the path off each

- **`metalPrices`** - the 5s random-walk ticker in `dashboard/page.tsx` stays, labeled in a comment as a dev-only placeholder. Next step: a `GET /api/prices` polling endpoint (or a websocket if updates need to be sub-second) backed by whatever price oracle the eventual chain integration uses - see `docs/04-integration.md` for the chain-vs-Mongo sourcing question this would inherit.
- **`userHoldings.apxiTokens`** - still feeds `asset-allocation-chart.tsx`'s "APX-i Index Token" card. Not part of the `Holding` model (gold/silver/platinum only, per Task 2B) - it's a derived aggregate, not a stored balance, so it needs its own decision about where it's computed (backend aggregation vs. frontend derivation from holdings) before it's worth wiring.
- **`vaultData`** (Proof of Reserve totals) and **`zakatCalculation`** - both still fully mocked. `vaultData` is the natural next candidate: same shape of work as holdings (a `GET /api/vault-summary`, one store, one view), but it's vault-wide aggregate data rather than per-user, so it likely wants a scheduled aggregation job rather than a live query - worth deciding before building it, not after.

Recommended order for the rest: `vaultData` next (highest-visibility view after this one), then a real price feed (unblocks the "still mocked" ticker and the accuracy of every USD figure on the page), then `apxiTokens`/Zakat last (lowest traffic, and Zakat's math depends on accurate live prices anyway).
