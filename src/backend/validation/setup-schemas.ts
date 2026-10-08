import { z } from "zod";
import { SEMESTERS, TRACKS, YEAR_LEVELS } from "@/shared/constants";

const ALL_YEAR_LEVELS = [...YEAR_LEVELS.college, ...YEAR_LEVELS.senior_high] as const;

export const termInputSchema = z.object({
  startYear: z.number().int().min(2000).max(2100),
  semester: z.enum(SEMESTERS),
});

export const programInputSchema = z.object({
  code: z.string().trim().min(1).max(20).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(120),
  track: z.enum(TRACKS),
  curriculum: z.array(z.object({
    code: z.string().trim().min(1).max(20).transform((value) => value.toUpperCase()),
    yearLevel: z.string().trim().min(1).max(20),
    semester: z.enum(["1st Semester", "2nd Semester"]),
    prerequisite: z.string().trim().max(120),
  })).optional(),
});

export const subjectInputSchema = z.object({
  code: z.string().trim().min(1).max(20).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(120),
  units: z.number().int().min(1).max(12),
  track: z.enum(TRACKS),
});

export const roomInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  building: z.string().trim().min(1).max(80),
  capacity: z.number().int().min(1).max(10000),
});

export const sectionInputSchema = z.object({
  termId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid term id."),
  name: z.string().trim().min(1).max(80),
  program: z.string().trim().min(1).max(20).transform((value) => value.toUpperCase()),
  yearLevel: z.enum(ALL_YEAR_LEVELS),
});

export const sectionUpdateSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  yearLevel: z.enum(ALL_YEAR_LEVELS).optional(),
});
