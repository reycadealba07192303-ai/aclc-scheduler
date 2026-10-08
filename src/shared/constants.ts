export const TRACKS = ["college", "senior_high"] as const;

export const YEAR_LEVELS = {
  college: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
  senior_high: ["Grade 11", "Grade 12"],
} as const;

export const ACCOUNT_STATUSES = ["active", "inactive"] as const;

export const SCHEDULE_MODES = ["f2f", "online"] as const;
export const SEMESTERS = ["1st Semester", "2nd Semester", "Summer"] as const;

/** 0 = Monday … 6 = Sunday. Never use Date.getDay() numbering for stored values. */
export const DAY_MIN = 0;
export const DAY_MAX = 6;

/** Minutes from midnight: 07:00 to 21:00. */
export const DAY_START_MINUTES = 420;
export const DAY_END_MINUTES = 1260;
export const SLOT_STEP_MINUTES = 30;
