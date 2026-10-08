# Deploying ACLC Scheduler

How to put the system online (web app and API on **Vercel**, data on **MongoDB Atlas**) and publish the Android teacher app. For ACLC's administrators and the developer.

> Never paste passwords, connection strings, or keys into this repository, chat, or email. They belong only in Vercel's and GitHub's secret settings.

## What runs where

| Part | Where | Notes |
| --- | --- | --- |
| Web app + API | Vercel (Singapore region, set in `vercel.json`) | Deploys automatically from the `main` branch |
| Database | MongoDB Atlas, database `aclc_scheduler` | Free tier (M0): no built-in backups |
| Teacher app (Android) | GitHub Releases of this repository | Built and signed by the "Teacher app release" workflow |
| Checks | GitHub Actions ("CI") | Lint, type check, tests, and build on every push and pull request |

## 1. Accounts

Use an ACLC-controlled email for each account, turn on two-factor authentication, and invite the developer (don't share passwords):

- **GitHub:** owns this repository.
- **Vercel:** hosts the web app.
- **MongoDB Atlas:** holds the database.

## 2. MongoDB Atlas

1. **Database Access → Add New Database User**:
   - **App user:** a long random password, with **Specific Privileges → `readWrite` on `aclc_scheduler`**. The web app uses this one.
   - **Backup user:** `read` on `aclc_scheduler`.
2. **Network Access → Add IP Address → Allow access from anywhere (`0.0.0.0/0`).** Vercel's addresses change, so this is required on the free tier; the app user's password and limited role are the protection.
3. **Connect → Drivers** gives the connection string. Add the database name before the `?`:
   `mongodb+srv://<app-user>:<password>@<cluster-host>/aclc_scheduler?appName=Cluster0`

## 3. Vercel

1. **Add New → Project → Import** this GitHub repository. Vercel detects Next.js; keep the defaults.
2. Under **Environment Variables**, add these for **Production** (see `.env.example` for what each one does):

   | Name | Value |
   | --- | --- |
   | `MONGODB_URI` | the Atlas connection string from step 2 |
   | `AUTH_SECRET` | a **new** random value: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
   | `AUTH_BOOTSTRAP_KEY` | another new random value |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | the school's email settings |

   A new `AUTH_SECRET` signs everyone out once, which is expected.
3. **Deploy.** The site gets an HTTPS address such as `https://aclc-scheduler.vercel.app`. A custom domain can be added later under **Settings → Domains**.
4. **Check it:**
   - The landing page loads.
   - Signing in works for an admin, a teacher, and a student.
   - `curl -I https://<address>/` shows the security headers (`Content-Security-Policy`, `Strict-Transport-Security`, …).

From then on, every push to `main` deploys automatically, and pull requests get their own preview address.

## 4. Teacher app (Android)

Do this once Vercel has an HTTPS address, because the app is built for that address.

1. **Create ACLC's signing key** (once, and keep it forever: losing it means teachers must uninstall and reinstall to update). Use a JDK's `keytool`:

   ```bash
   keytool -genkeypair -v -keystore aclc-release.jks -alias aclc -keyalg RSA -keysize 2048 -validity 10000
   ```

   Store the `.jks` file and both passwords in ACLC's password manager, with a backup copy.
2. In GitHub, go to **Settings → Secrets and variables → Actions**:
   - **Variables:** `API_BASE_URL` = the production address, for example `https://aclc-scheduler.vercel.app`.
   - **Secrets:**
     - `ANDROID_KEYSTORE_BASE64`: the `.jks` file in base64 (`base64 -w0 aclc-release.jks`, or on Windows `[Convert]::ToBase64String([IO.File]::ReadAllBytes("aclc-release.jks"))`)
     - `ANDROID_KEYSTORE_PASSWORD`
     - `ANDROID_KEY_ALIAS` (`aclc`)
     - `ANDROID_KEY_PASSWORD`
3. **Release:** set `version:` in `mobile/pubspec.yaml` (for example `0.1.0+1`), commit, then push a tag:

   ```bash
   git tag mobile-v0.1.0 && git push origin mobile-v0.1.0
   ```

   The **Teacher app release** workflow builds and signs the APKs and publishes a GitHub Release with:
   - `aclc-scheduler-teacher.apk`: most phones, about 26 MB
   - `aclc-scheduler-teacher-older-phones.apk`: older 32-bit phones
4. **Point the landing page at it:** in Vercel, add these, then redeploy:
   - `TEACHER_APP_URL` = `https://github.com/<owner>/<repo>/releases/latest/download/aclc-scheduler-teacher.apk`
   - `TEACHER_APP_VERSION` = `0.1.0`
   - `TEACHER_APP_SIZE` = `26 MB`

   The `latest` link always serves the newest release, so later releases only need the version and size updated.

## 5. Day-to-day

- **Checks:** GitHub Actions runs lint, type check, the test suite (with a throwaway MongoDB), the production build, and the Flutter checks on every push and pull request. A red ✗ on a commit means something broke.
- **Running checks locally:**

  ```bash
  npm run lint && npm run typecheck && npm test && npm run build
  cd mobile && flutter analyze && flutter test
  ```

  `npm test` needs a local MongoDB at `127.0.0.1:27017`. The tests use their own database, `aclc_scheduler_test`, and refuse to run against any other.
- **Rolling back a bad deploy:** Vercel → **Deployments** → choose the last good one → **Promote to Production**.
- **Dependency updates:** Dependabot opens pull requests weekly; merge them when CI passes.
