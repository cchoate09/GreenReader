# GreenReader Release Readiness Plan

Updated: 2026-03-19

This document captures the remaining work I would do before calling GreenReader release-ready. The goal is to split the work into small batches we can ship and verify one at a time instead of trying to do a single large release scramble.

## Current State

- Quick Read is the right default flow and the instruction card on the main screen has been moved higher so it no longer sits under the bottom control stack.
- Android local release signing is wired up, but the release process still needs cleanup and documentation.
- Unit coverage exists for physics, read quality, and reducer logic, but there is still no device-level regression coverage.

## Batch 1: Release Blockers

Ship these before submitting a production build.

- Replace remaining production placeholders:
  - `src/components/AdBanner.js`: iOS production ad unit is still a placeholder.
  - `eas.json`: Apple submit values are still placeholders.
- Move Play submission credentials out of a repo-relative workflow:
  - `eas.json` currently points to `./google-play-key.json`.
  - Prefer CI secrets, EAS secret file handling, or a documented local-only ignored path.
- Clean up the Android release build path:
  - Verify `bundleRelease` succeeds without needing manual task skips.
  - If lint still needs extra heap or a config adjustment, codify that instead of relying on one-off commands.
- Back up and document signing assets:
  - confirm the upload keystore backup location,
  - confirm alias/password ownership,
  - add a short internal release checklist for future builds.

## Batch 2: UI and Product Polish

These are the highest-value user-facing improvements I still see.

- Fix encoding artifacts and presentation rough edges:
  - `src/screens/PermissionScreen.js` contains mojibake in the icon/comment text and should be cleaned up.
- Do one responsive-layout sweep on real devices:
  - small Android screens,
  - gesture-nav Android devices,
  - larger iPhones.
- Audit spacing between the bottom panel and banner ad so the control stack still feels intentional when the ad is present.
- Review empty states and helper copy on the main screen:
  - make sure the instruction language matches the actual button names,
  - keep copy short enough to fit under large font settings.
- Add a clearer success state after a read is completed so the user knows whether they are looking at a fresh read, a stale read, or preview mode.

## Batch 3: Accuracy and Trust

This is the most important product-quality batch after the basic release blockers.

- Field-validate distance estimation across multiple devices and heights:
  - current distance tuning is better, but it still needs measured test putts.
- Re-test hole detection outdoors:
  - current detection is still a dark-cluster heuristic in `src/utils/holeDetection.js`,
  - manual placement should remain the safe default until detection is proven reliable.
- Tune confidence messaging:
  - make sure the read-quality badge actually matches what golfers experience in the field,
  - add clearer low-confidence guidance when sensor stability is poor.
- Build a small validation matrix:
  - short / medium / long putts,
  - uphill / downhill,
  - bright sun / shade,
  - different green speeds.

## Batch 4: QA and Observability

This batch reduces launch-day surprises.

- Add a short manual regression checklist for every release:
  - first-run permission flow,
  - denied-permission flow,
  - Read Slope flow,
  - Set Hole manual flow,
  - auto-detect confirm/adjust flow,
  - preview animation,
  - training mode,
  - ad load / ad failure behavior.
- Expand automated coverage beyond pure utilities:
  - at least one smoke-level render test for the main screen state transitions,
  - one regression test around the default instruction/empty state.
- Decide on crash/error monitoring before launch:
  - Sentry, Bugsnag, Firebase Crashlytics, or equivalent.
- Gate or remove development logging in production:
  - `App.js`,
  - `src/components/AdBanner.js`.

## Batch 5: Store and Launch Operations

This is the packaging and go-live batch.

- Prepare store listing assets:
  - screenshots,
  - feature graphic,
  - short description,
  - long description,
  - privacy policy URL,
  - support contact.
- Confirm app metadata before each release:
  - `app.json` version,
  - Android `versionCode`,
  - final package identifiers,
  - final permission copy.
- Do one clean internal-track release and test install from Play before pushing wider.
- Verify monetization and policy compliance on the release binary, not just dev builds.

## Suggested Order

1. Batch 1: Release Blockers
2. Batch 2: UI and Product Polish
3. Batch 3: Accuracy and Trust
4. Batch 4: QA and Observability
5. Batch 5: Store and Launch Operations

## My Recommendation

If we want the fastest safe path to release, I would tackle the next sprint in this order:

1. Fix the remaining placeholder/config issues and harden the release path.
2. Clean up the permission/onboarding polish issues.
3. Run a focused field-test pass for distance and hole placement accuracy.
4. Ship one internal-track candidate and do a device/regression sweep before store submission.
