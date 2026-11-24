# BudgetBuddy Android Cloud Build Starter

This is a **packaging starter**, not the complete BudgetBuddy application source.

## Before building
1. Export/copy the complete existing BudgetBuddy React + Vite project into this repository root.
2. Preserve its existing `src/`, `public/`, backend integration, and `package.json`.
3. Merge the Capacitor dependencies and scripts below into the existing `package.json` (do not replace the existing dependencies).
4. Add the Capacitor config below.
5. Ensure no `.env` files, Supabase service-role keys, API secrets, or passwords are committed.
6. Commit and push to GitHub.

## GitHub Actions
After the complete app source and configuration are committed, open **Actions** and run **Build Android APK**.
The workflow builds a debug APK and uploads it as an artifact. It does not publish a signed Play Store release.

## Important
- This workflow assumes the Vite build output is `dist/`.
- The existing app's auth, Supabase connectivity, and API endpoints must be tested inside the Android WebView.
- Do not assume the APK works until the artifact is downloaded and installed on a real Android device.
