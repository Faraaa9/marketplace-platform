export interface StoryData {
  id: string;
  imageUrl: string;
  text: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface WorkProject {
  name: string;
  sub: string | null;
  photos: string[];
}

export interface BeforeAfterPair {
  before: string;
  after: string;
}

export interface WorkGallery {
  beforeAfter: BeforeAfterPair | null;
  projects: WorkProject[];
}

export interface ProviderProfileData {
  id: string;
  name: string;
  image: string | null;
  images: string[];
  gallery: WorkGallery;
  description: string | null;
  headline: string | null;
  services: string | null;
  priceFrom: number | null;
  experienceYears: number | null;
  offersInvoices: boolean;
  availableForUrgent: boolean;
  location: string | null;
  primaryCity: string | null;
  primaryService: string | null;
  website: string | null;
  phone: string | null;
  badge: string | null;
  isVerified: boolean;
  isPremium: boolean;
  isYoungTalent: boolean;
  isGoat: boolean;
  responseCount: number;
  acceptedCount: number;
  avgResponseTimeHours: number | null;
  profileCompleteness: number;
  avgRating: number | null;
  totalReviews: number;
  lastActiveAt: string;
  lastSeenAt: string | null;
  memberSince: string;
  moderationStatus: string;
  moderationReason: string | null;
}
