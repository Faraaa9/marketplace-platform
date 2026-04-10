import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Neteisingas el. pašto formatas"),
  password: z.string().min(6, "Slaptažodis turi būti bent 6 simbolių"),
});

export const registerSchemaBase = z.object({
  name: z.string().min(2, "Vardas turi būti bent 2 simbolių"),
  email: z.string().email("Neteisingas el. pašto formatas"),
  password: z.string().min(6, "Slaptažodis turi būti bent 6 simbolių"),
  confirmPassword: z.string(),
});

export const registerSchema = registerSchemaBase.refine((data) => data.password === data.confirmPassword, {
  message: "Slaptažodžiai nesutampa",
  path: ["confirmPassword"],
});

export const serviceRequestSchema = z.object({
  title: z.string().min(5, "Pavadinimas turi būti bent 5 simbolių").max(100),
  description: z.string().min(20, "Aprašymas turi būti bent 20 simbolių").max(2000),
  category: z.string().min(1, "Pasirinkite kategoriją"),
  location: z.string().min(1, "Pasirinkite miestą"),
  budget: z.string().optional(),
  clientName: z.string().min(2, "Vardas turi būti bent 2 simbolių"),
  clientEmail: z.string().email("Neteisingas el. pašto formatas"),
  clientPhone: z.string().optional(),
  createAccount: z.boolean().optional(),
  password: z.string().optional(),
}).refine(
  (data) => !data.createAccount || (data.password && data.password.length >= 6),
  { message: "Slaptažodis turi būti bent 6 simbolių", path: ["password"] }
);

export const responseSchema = z.object({
  message: z.string().min(10, "Žinutė turi būti bent 10 simbolių").max(2000),
  price: z.number().positive("Kaina turi būti teigiama").optional(),
});

export const messageSchema = z.object({
  content: z.string().min(5, "Žinutė turi būti bent 5 simbolių").max(1000),
});

export const providerProfileSchema = z.object({
  description: z.string().min(20, "Aprašymas turi būti bent 20 simbolių").max(2000),
  headline: z.string().max(120).optional().or(z.literal("")),
  services: z.string().max(1000).optional().or(z.literal("")),
  priceFrom: z.number().int().min(0).nullable().optional(),
  experienceYears: z.number().int().min(0).max(99).nullable().optional(),
  offersInvoices: z.boolean().optional(),
  availableForUrgent: z.boolean().optional(),
  specializations: z.array(z.string()).min(1, "Pasirinkite bent vieną specializaciją"),
  location: z.string().min(1, "Pasirinkite miestą"),
  phone: z.string().optional(),
  website: z.string().url("Neteisingas URL formatas").optional().or(z.literal("")),
});

export const directInquirySchema = z.object({
  providerId: z.string().min(1, "Trūksta tiekėjo ID"),
  description: z.string().min(20, "Žinutė turi būti bent 20 simbolių").max(2000, "Žinutė per ilga (max 2000)"),
  budget: z.string().max(100).optional().or(z.literal("")),
  senderEmail: z.string().email("Neteisingas el. pašto formatas").optional().or(z.literal("")),
  senderPhone: z.string().max(20).optional().or(z.literal("")),
  senderName: z.string().max(100).optional().or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;
export type ResponseInput = z.infer<typeof responseSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;
export type DirectInquiryInput = z.infer<typeof directInquirySchema>;
