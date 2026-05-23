import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Neteisingas el. pašto formatas"),
  password: z.string().min(6, "Slaptažodis turi būti bent 6 simbolių"),
});

export const registerSchemaBase = z.object({
  name: z.string().min(2, "Vardas turi būti bent 2 simbolių"),
  email: z.string().email("Neteisingas el. pašto formatas"),
  password: z.string().min(8, "Slaptažodis turi būti bent 8 simbolių"),
  confirmPassword: z.string(),
});

export const registerSchema = registerSchemaBase.refine((data) => data.password === data.confirmPassword, {
  message: "Slaptažodžiai nesutampa",
  path: ["confirmPassword"],
});

export const serviceRequestSchema = z.object({
  title: z.string().min(5, "Pavadinimas turi būti bent 5 simbolių").max(100),
  description: z.string().min(20, "Aprašymas turi būti bent 20 simbolių").max(2000),
  categoryId: z.string().min(1, "Pasirinkite kategoriją"),
  location: z.string().min(1, "Nurodykite miestą ar vietovę").max(100),
  budget: z.string().min(1, "Nurodykite biudžetą").max(100),
  deadline: z.string().min(1, "Nurodykite terminą").max(100),
  attachmentUrls: z.array(z.string().url().includes("res.cloudinary.com")).max(5, "Daugiausia 5 nuotraukos").optional(),
  clientName: z.string().min(2, "Vardas turi būti bent 2 simbolių"),
  clientEmail: z.string().email("Neteisingas el. pašto formatas"),
  // Phone is optional — a verified email (or the session's verified address)
  // satisfies the "at least one contact" requirement on its own.
  clientPhone: z
    .string()
    .trim()
    .max(30, "Telefono numeris per ilgas")
    .optional()
    .or(z.literal("")),
  createAccount: z.boolean().optional(),
  password: z.string().optional(),
  honeypot: z.string().optional(),
}).refine(
  (data) => !data.createAccount || (data.password && data.password.length >= 8),
  { message: "Slaptažodis turi būti bent 8 simbolių", path: ["password"] }
);

// Editable subset of a service request — excludes clientEmail (verified identity)
// and the account/honeypot fields used only at creation.
export const serviceRequestEditSchema = z.object({
  title: z.string().min(5, "Pavadinimas turi būti bent 5 simbolių").max(100),
  description: z.string().min(20, "Aprašymas turi būti bent 20 simbolių").max(2000),
  categoryId: z.string().min(1, "Pasirinkite kategoriją"),
  location: z.string().min(1, "Nurodykite miestą ar vietovę").max(100),
  budget: z.string().min(1, "Nurodykite biudžetą").max(100),
  deadline: z.string().min(1, "Nurodykite terminą").max(100),
  attachmentUrls: z.array(z.string().url().includes("res.cloudinary.com")).max(5, "Daugiausia 5 nuotraukos").optional(),
  clientName: z.string().min(2, "Vardas turi būti bent 2 simbolių"),
});

export const improveDescriptionSchema = z.object({
  description: z
    .string()
    .min(15, "Parašykite bent kelis žodžius")
    .max(2000, "Tekstas per ilgas (daugiausia 2000 simbolių)"),
  category: z.string().max(100).optional(),
  title: z.string().max(150).optional(),
});

export const transcribeAudioSchema = z.object({
  audio: z
    .string()
    .min(1, "Trūksta garso įrašo")
    .max(4_000_000, "Garso įrašas per didelis"),
});

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
  categoryIds: z.array(z.string()).min(1, "Pasirinkite bent vieną kategoriją").max(6, "Daugiausia 6 kategorijos"),
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
export type ServiceRequestEditInput = z.infer<typeof serviceRequestEditSchema>;
export type ImproveDescriptionInput = z.infer<typeof improveDescriptionSchema>;
export type ResponseInput = z.infer<typeof responseSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type ProviderProfileInput = z.infer<typeof providerProfileSchema>;
export type DirectInquiryInput = z.infer<typeof directInquirySchema>;
