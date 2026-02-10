// Zod Validation Schemas
import { z } from 'zod';

// Auth Schemas
export const setupSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(12).max(128)
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  passwordConfirm: z.string(),
}).refine(data => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ['passwordConfirm'],
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Agent Control Schemas
export const emergencyStopSchema = z.object({
  confirmation: z.literal('CONFIRM'),
});

export type SetupInput = z.infer<typeof setupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EmergencyStopInput = z.infer<typeof emergencyStopSchema>;
