export interface Crop {
  id: string;
  name: string;
  scientificName?: string;
  description?: string;
  optimalN?: number;
  optimalP?: number;
  optimalK?: number;
  optimalTemp?: number;
  optimalHumidity?: number;
  optimalRainfall?: number;
  optimalPh?: number;
  suitableSoilTypes?: string;
  season?: string;
  imageUrl?: string;
  marketPrice?: number;
  cultivationTips?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CropRecommendation {
  id: string;
  userId: string;
  cropId?: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  phValue: number;
  soilType: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  confidenceScore?: number;
  recommendedCrops?: string;
  createdAt?: string;
}

export interface PricePrediction {
  id: string;
  userId: string;
  cropId?: string;
  predictedPrice: number;
  currentPrice: number;
  predictionDate: string;
  factors?: string;
  createdAt?: string;
}

export interface DiseasePrediction {
  id: string;
  userId: string;
  cropName: string;
  diseaseName: string;
  confidence: number;
  symptoms?: string;
  treatment?: string;
  imageUrl?: string;
  createdAt?: string;
}

export interface GovernmentScheme {
  id: string;
  title: string;
  description?: string;
  eligibility?: string;
  benefits?: string;
  howToApply?: string;
  deadline?: string;
  state?: string;
  category?: string;
  officialLink?: string;
  isActive?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Newsletter {
  id: string;
  title: string;
  content?: string;
  excerpt?: string;
  imageUrl?: string;
  category?: string;
  author?: string;
  publishedDate?: string;
  isPublished?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message?: string;
  status?: string;
  priority?: string;
  adminResponse?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  userId: string;
  fullName?: string;
  phoneNumber?: string;
  state?: string;
  district?: string;
  farmSize?: number;
  farmingType?: string;
  isAdmin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatbotConversation {
  id: string;
  userId: string;
  message: string;
  response: string;
  createdAt?: string;
}

export interface EmailOTPVerification {
  id: string;
  email: string;
  otpCode: string;
  expiresAt: string;
  verified: number;
  attempts: number;
  createdAt?: string;
}
