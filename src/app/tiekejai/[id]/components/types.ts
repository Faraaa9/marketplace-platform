export interface StoryData {
  id: string;
  imageUrl: string;
  text: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface ProviderProfileData {
  id: string;
  name: string;
  image: string | null;
  images: string[];
  description: string | null;
  headline: string | null;
  services: string | null;
  priceFrom: number | null;
  experienceYears: number | null;
  offersInvoices: boolean;
  availableForUrgent: boolean;
  specializations: string[];
  location: string | null;
  website: string | null;
  planType: string;
  badge: string | null;
  responseCount: number;
  acceptedCount: number;
  avgResponseTimeHours: number | null;
  profileCompleteness: number;
  avgRating: number | null;
  totalReviews: number;
  lastActiveAt: string;
  memberSince: string;
}
