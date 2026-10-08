# ACLC Teacher mobile app

Flutter app for teacher sign-in, assigned active-term sections/classes, and opening or closing attendance. Teachers scan the signed QR displayed by each student; student codes refresh every 10 seconds.

## Run locally

1. Start MongoDB and the Next.js app at `http://localhost:3000`.
2. Start an Android emulator. The default API URL is `http://192.168.254.107:3000` (this computer's Wi-Fi IP), set in `lib/core/config/app_config.dart`. Change it there if the computer's IP changes; for the Android emulator use `http://10.0.2.2:3000`.
3. Run from this folder:

   ```powershell
   flutter run
   ```

### Physical phone (server address)

Start Next.js so other devices can reach it (`npm run dev -- --hostname 0.0.0.0`), put the phone on the same Wi-Fi, then on the sign-in screen tap **Server · …** and enter the computer's Wi-Fi IP with port 3000 (for example `192.168.254.107:3000`). The app tests the address before saving it and remembers it on the phone, so a changed IP only needs re-entering there, not a rebuild. Find the computer's IP with `ipconfig` (the Wi-Fi adapter's IPv4 address).

A build-time default can still be set with `--dart-define=API_BASE_URL=http://<IP>:3000`; an address saved in the app takes priority. If a rebuilt APK still shows the old address, run `flutter clean` first: Gradle can package a stale cached build that ignores a changed `--dart-define`. Android cleartext HTTP is enabled only in the debug manifest. Use HTTPS for iOS devices and release builds.

The mobile login accepts active **teacher** accounts only. Authentication uses a seven-day signed token stored with `flutter_secure_storage` and sent to the Next.js API as a Bearer token. `AUTH_SECRET` must match between the Next.js server and all API instances.

## Code structure

```text
lib/
├── main.dart                         # Application entry point
├── app/                              # App shell and design theme
├── core/                             # API client, config, errors, and colors
├── features/
│   ├── auth/                         # Sign-in UI and auth repository
│   ├── attendance/                   # Camera scanner and attendance session
│   ├── handled_classes/              # Section classes and attendance actions
│   └── teacher_home/                 # Portal repository, navigation, and tabs
└── shared/                           # Reusable widgets and formatters
```

Screens call feature repositories; repositories use the shared API client. Keep app-wide styling in `app/theme` and reusable presentation components in `shared/widgets`.

## Updating the landing-page download

The landing page offers the Android app at `/downloads/aclc-scheduler-teacher.apk`. After changing the app, rebuild and copy it:

```powershell
flutter build apk --debug
Copy-Item build\app\outputs\flutter-apk\app-debug.apk ..\public\downloads\aclc-scheduler-teacher.apk
```

Use a release build (`flutter build apk --release`) once the server has an HTTPS address.
