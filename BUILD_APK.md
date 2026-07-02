# Building the Android APK

Capacitor is already wired up in this project. Follow these steps on **your own computer** (Android Studio can't run in the Lovable sandbox).

## Prerequisites (one-time)

1. **Node.js 20+** and **Bun** (or npm)
2. **Android Studio** — https://developer.android.com/studio
3. **JDK 17** (bundled with recent Android Studio installs)
4. Open Android Studio once → *More Actions → SDK Manager* → install:
   - Android SDK Platform 34 (or latest)
   - Android SDK Build-Tools
   - Android SDK Command-line Tools

## Export & build

```bash
# 1. Pull this project from GitHub (use the "Export to GitHub" button in Lovable)
git clone <your-repo-url>
cd <repo-folder>

# 2. Install dependencies
bun install     # or: npm install

# 3. Build the web app
bun run build   # or: npm run build

# 4. Add the Android platform (only the first time)
npx cap add android

# 5. Copy the web build into the Android project
npx cap sync android

# 6. Open in Android Studio
npx cap open android
```

Android Studio will open the `android/` folder. Wait for Gradle to finish syncing (first time takes a few minutes).

## Generate the APK

In Android Studio:

1. Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. Wait for the build (~1 min). A notification appears in the bottom-right: **"APK(s) generated successfully"** → click **locate**.
3. The debug APK is at `android/app/build/outputs/apk/debug/app-debug.apk`.
4. Copy it to your phone (USB, Google Drive, WhatsApp to yourself) and tap to install. You may need to enable **"Install from unknown sources"** in Android settings.

## Signed release APK (for distribution)

For an APK you can hand out or upload to the Play Store:

1. In Android Studio: **Build → Generate Signed Bundle / APK…**
2. Choose **APK**, then **Create new…** to generate a keystore (save it somewhere safe — you'll need it for every future update).
3. Fill in the details, pick **release**, and finish. The signed APK appears in `android/app/release/`.

## Updating the app after code changes

Every time you change the app in Lovable:

```bash
git pull
bun install
bun run build
npx cap sync android
# then Build → Build APK(s) again in Android Studio
```

## App identity

Change these in `capacitor.config.ts` if you want a different app id or display name:

- `appId`: `tz.ac.mzumbe.examvenues` (must be unique on the Play Store)
- `appName`: `Mzumbe Exam Booking`

Then re-run `npx cap sync android`.

## Icon & splash

After `npx cap add android`, replace the placeholder icons in
`android/app/src/main/res/mipmap-*/` with your own, or use
[@capacitor/assets](https://github.com/ionic-team/capacitor-assets) to
generate them from a single source image.
