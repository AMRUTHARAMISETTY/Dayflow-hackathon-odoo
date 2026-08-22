import { z } from "zod"

export const leaveFormSchema = z
  .object({
    startDate: z.string().min(1, "Pick a start date"),
    endDate: z.string().min(1, "Pick an end date"),
    halfDayStart: z.boolean(),
    halfDayEnd: z.boolean(),
    type: z.enum(["Paid", "Sick", "Unpaid"]),
    reason: z.string().min(5, "Give a brief reason (at least 5 characters)"),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date can't be before the start date",
    path: ["endDate"],
  })

export type LeaveFormValues = z.infer<typeof leaveFormSchema>

export const DEFAULT_LEAVE_FORM: LeaveFormValues = {
  startDate: "",
  endDate: "",
  halfDayStart: false,
  halfDayEnd: false,
  type: "Paid",
  reason: "",
}
