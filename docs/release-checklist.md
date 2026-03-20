# GreenReader Release Checklist

Updated: 2026-03-20

This is the operating checklist for Android releases while the app is in Play internal testing and on the way to production.

## Local Files That Must Stay Out Of Git

- `./.secrets/google-play-key.json`
- `android/app-upload.jks`
- `android/keystore.properties`

## Android Release Flow

1. Confirm tests pass.
2. Run `npm run release:check`.
3. Run `npm run release:android:bundle`.
4. Confirm the bundle exists at `android/app/build/outputs/bundle/release/app-release.aab`.
5. Submit with `eas submit --platform android --profile production`.
6. Verify the release lands in the Play internal track as a draft.

## What `release:check` Verifies

- Android AdMob app and banner IDs are present.
- The Android EAS submit profile points to a gitignored path under `./.secrets/`.
- The repo no longer relies on placeholder iOS submit values checked into `eas.json`.
- Local signing files are present when building on this machine.

## Manual Items Still Required Before Any iOS Release

- Replace the iOS AdMob app ID in `app.json` with a real production value.
- Configure a real iOS banner ad unit and re-enable iOS banner ads.
- Add real App Store Connect submit values to `eas.json` or provide them at submit time.

## Internal Testing Notes

- The app is currently targeting the Play `internal` track in `eas.json`.
- Keep `releaseStatus` as `draft` until the build and metadata have been reviewed in Play Console.
