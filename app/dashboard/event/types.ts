export type EventStatus = "draft" | "pending" | "rejected" | "verified";

export type EventTicket = {
  title: string;
  description: string;
  price: number;
  discountPercent?: number;
  quantity: number;
  couponCode?: string;
};

export type EventOrgRef = {
  name: string;
  logoUrl?: string;
};

export type EventPartyRef = {
  name: string;
  logoUrl?: string;
};

export type EventFaq = {
  question: string;
  answer: string;
};

export type EventHost = {
  name: string;
  imageUrl?: string;
  show?: boolean;
  url?: string;
};

export type EventItem = {
  id: string;
  title?: string;
  description?: string;
  launchDateTime?: string;
  startDateTime?: string;
  endDateTime?: string;
  startDate?: string;
  endDate?: string;
  timeText?: string;
  location?: {
    address?: string;
    name?: string;
    show?: boolean;
    radiusKm?: number;
    placeId?: string;
    lat?: number;
    lng?: number;
  };
  bannerUrl?: string;
  tags?: string[];
  termsHtml?: string;
  aboutHtml?: string;
  thingsToKnow?: string;
  amenities?: string;
  buttonText?: string;
  faqs?: EventFaq[];
  hosts?: EventHost[];
  unlockQrAtVenue?: boolean;
  groupsEnabled?: boolean;
  vehicleVerified?: boolean;
  organiser?: EventOrgRef;
  sponsors?: EventPartyRef[];
  partners?: EventPartyRef[];
  galleryUrls?: string[];
  tickets?: EventTicket[];
  status?: string;
};
