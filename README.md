# ACLC Scheduler

ACLC Scheduler has a Next.js web portal for Super Admin and students, a Flutter mobile app for teachers, and a shared MongoDB backend. Teachers use the mobile app to open attendance and scan each student's personal QR. The student portal refreshes the signed QR every 10 seconds.

## Run the web app

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`. Configure private database, authentication, and SMTP settings in `src/backend/.env`; use `.env.example` as the safe template.

## Run the teacher mobile app

See [mobile/README.md](mobile/README.md). Start the web API, open an Android emulator, then run:

```powershell
cd mobile
flutter pub get
flutter run
```

The default Android emulator API URL is `http://10.0.2.2:3000`. Set `API_BASE_URL` with `--dart-define` for other devices or deployments. The mobile login accepts active teacher accounts only and stores its signed API token in platform secure storage.

## Project layout

- `src/app`, `src/frontend`: Next.js web UI and API routes
- `src/backend`: authentication, services, MongoDB models
- `src/shared`: shared types and utilities
- `mobile`: Flutter teacher app (Android and iOS)
