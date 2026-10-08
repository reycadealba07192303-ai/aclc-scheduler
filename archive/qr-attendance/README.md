# Archived: QR attendance

Removed from the Classroom Scheduler (pure scheduling only). Kept here as
reference for the separate attendance system. Not built, type-checked, or linted.

Contents (paths mirror the original `src/`):
- `app/student/` - student portal: schedule, rotating QR, attendance history
- `app/admin/attendance/`, `app/admin/reports/` - admin attendance monitor and reports
- `components/admin/ImportStudentsModal.tsx` - Excel import (Student ID, Name, Section);
  needs `read-excel-file` (`npm i read-excel-file`)
- `data/mock.ts`, `types/index.ts`, `components/ui/StatusBadges.tsx` - snapshots
  of the shared files these pages used, before they were trimmed

The `layout.tsx` files in `app/student/`, `app/admin/attendance/` and
`app/admin/reports/` only redirect; delete them when restoring the pages.
