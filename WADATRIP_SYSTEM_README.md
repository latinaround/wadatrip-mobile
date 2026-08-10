# WadaTrip System README

This file is the short source of truth for how WadaTrip is organized today.

## 1. Current Source Of Truth

### Mobile app
- Repo: `C:\Projects\wadatrip-mobile`
- Purpose: React Native / Expo app for Android now, iPhone next.
- This is the source of truth for mobile UX, traveler flow, host flow, WadaAgent mobile, and Community mobile.

### Backend + public web
- Repo: `C:\Projects\wadatrip\wadatrip\wadatrip-platform`
- Purpose: backend services, API, database schema, and the current public web app.
- Current active web source: `apps/web`
- Current backend source: gateway + services inside the same monorepo.

### Legacy / do not treat as source of truth
- `wadatrip-platform/vercel-static`
  - legacy static copy
  - keep only as fallback/archive unless intentionally revived
- any older separate `wadatrip-web` copy
  - do not assume it is the active production frontend unless Vercel is explicitly repointed there

## 2. Production Deploy Map

### Render
- Hosts the backend/API
- Base URL: `https://wadatrip.onrender.com`
- This is where gateway, WadaAgent, provider/listings/bookings/pricing services live

### Vercel
- Hosts the public web frontend
- Public URL: `https://www.wadatrip.com`
- Correct project root: `apps/web` inside `wadatrip-platform`
- Correct build shape:
  - Root Directory: `apps/web`
  - Build Command: `yarn build`
  - Output Directory: `dist`

## 3. What To Trust When There Is Confusion

If two places contain similar code, trust this order:

1. `wadatrip-mobile` for mobile
2. `wadatrip-platform/apps/web` for public web
3. `wadatrip-platform` services for backend/API
4. `vercel-static` only as legacy reference

If Vercel settings still point to `apps/web`, then `apps/web` is the live web source of truth.

## 4. Product Model We Chose

### Marketplace model
- Experience first
- Host comparison second
- Booking third

This means:
- travelers should first see one destination/experience
- then compare verified hosts
- then reserve

This is better than duplicated listings with the same destination photo.

### Media model
- one destination or experience cover where possible
- one host identity block per guide/operator
- avoid many low-quality repeated photos

### Guide identity
Each guide should eventually have:
- real profile photo
- short bio
- tours published
- reviews and trust signals
- their own guide agent later

## 5. Current Data Contract Already Added

Backend already supports these concepts:
- `providers.photo_url`
- `providers.bio_short`
- `listings.cover_image_url`
- `destination_covers`

That means mobile and web can show:
- real guide photo when available
- guide bio
- cover image per experience/listing
- fallback editorial destination cover

## 6. Best Structure For Scaling Later

This is the recommended long-term structure.

### Keep only two real product repos
1. `wadatrip-mobile`
2. `wadatrip-platform`

Do not keep three competing frontend sources.

### Recommended ownership
- `wadatrip-mobile`
  - all mobile app UI and flows
- `wadatrip-platform/apps/web`
  - all public website UI and web conversion funnel
- `wadatrip-platform/services/*`
  - all backend business logic
- `wadatrip-platform/libs/*`
  - shared contracts, db schema, common utilities

### Recommended clean-up
- treat `vercel-static` as deprecated
- archive or clearly label any old `wadatrip-web` copy
- keep one active Vercel project only for `apps/web`

## 7. Best Technical Direction From Here

### Near term
1. closed beta on Android
2. fix friction from real testers
3. then open iPhone/TestFlight
4. keep web focused on acquisition + conversion

### Backend discipline
1. keep API contracts centralized
2. avoid duplicating the same endpoint shape across multiple ad hoc files
3. add one short architecture doc in `wadatrip-platform` too
4. keep env vars documented by service

### Frontend discipline
1. mobile and web can differ visually
2. but traveler logic should stay aligned:
   - discover
   - compare host
   - reserve
3. host logic should stay aligned:
   - apply
   - publish
   - earn

## 8. Next Architecture Move I Recommend

Inside `wadatrip-platform`, add a permanent doc like:
- `SYSTEM_ARCHITECTURE.md`

That file should contain:
- service map
- env var ownership
- deploy map
- active frontend path
- deprecated paths

Then nobody has to guess again whether web comes from:
- `apps/web`
- `vercel-static`
- or an old external repo

## 9. Rules To Avoid Future Chaos

1. one active web frontend only
2. one active mobile repo only
3. one documented deploy path per surface
4. every legacy path marked as legacy in its own README
5. never change Vercel root or Render topology without updating docs the same day

## 10. Business Priority Order

Because WadaTrip needs to sell, product work should stay in this order:

1. traveler conversion
2. host onboarding and trust
3. host identity and media
4. guide-specific agent
5. broader community/social layers

The guide-specific agent is a strong differentiator, but it should sit on top of a clean host identity layer first.

## 11. Short Version

If you forget everything else, remember this:
- mobile lives in `wadatrip-mobile`
- backend lives in `wadatrip-platform`
- public web lives in `wadatrip-platform/apps/web`
- `vercel-static` is legacy
- Render serves API
- Vercel serves web
- experience-first is the correct marketplace model
