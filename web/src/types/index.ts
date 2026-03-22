export interface Listing {
  id: string
  title: string
  location: string
  price: number
  pricePerNight: number
  currency?: string
  rating: number
  reviewCount: number
  imageUrl: string
  images: string[]
  amenities: string[]
  description: string
  airbnbUrl: string
  listingId: string
}

export interface ParsedFilters {
  destination?: string
  country?: string
  checkIn?: string
  checkOut?: string
  guests?: number
  propertyType?: string
  minPrice?: number
  maxPrice?: number
  amenities?: string[]
  vibe?: string
}

export interface Search {
  id: string
  userId: string
  query: string
  parsedFilters: ParsedFilters
  results: Listing[]
  resultCount: number
  createdAt: string
}

export interface SavedStay {
  id: string
  userId: string
  listingId: string
  title: string
  location: string
  price: number
  imageUrl: string
  airbnbUrl: string
  savedAt: string
}
