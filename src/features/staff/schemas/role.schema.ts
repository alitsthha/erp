import { z } from "zod";

const permissionSchema = z.object({
  view: z.boolean().default(false),
  create: z.boolean().default(false),
  edit: z.boolean().default(false),
  delete: z.boolean().default(false),
});

export const roleSchema = z.object({
  roleCode: z.string().optional(),

  name: z
    .string()
    .min(2, "Role name is required"),

  description: z
    .string()
    .min(3, "Description is required"),

  department: z
    .string()
    .min(1, "Department is required"),

  color: z.string(),

  displayOrder: z.coerce.number().int().default(1),

  staffCount: z.coerce.number().int().default(0),

  status: z.enum([
    "Active",
    "Inactive",
  ]),

  permissions: z.object({
    dashboard: permissionSchema,
    students: permissionSchema,
    activities: permissionSchema,
    enrollments: permissionSchema,
    attendance: permissionSchema,
    billing: permissionSchema,
    expenses: permissionSchema,
    staff: permissionSchema,
    payroll: permissionSchema,
    reports: permissionSchema,
    settings: permissionSchema,
  }),
});

export type RoleFormData = z.infer<typeof roleSchema>;