import { z } from "zod";
import { ACCOUNT_STATUSES } from "@/shared/constants";

const personFields = {
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  status: z.enum(ACCOUNT_STATUSES).default("active"),
};

export const teacherInputSchema = z.object({
  ...personFields,
  employeeNumber: z.string().trim().min(1).max(40),
});

export const administratorInputSchema = z.object(personFields);
