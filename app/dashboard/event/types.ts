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

export type EventItem = {
  id: string;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  timeText?: string;
  location?: {
    address?: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  };
  bannerUrl?: string;
  tags?: string[];
  termsHtml?: string;
  aboutHtml?: string;
  organiser?: EventOrgRef;
  sponsors?: EventPartyRef[];
  partners?: EventPartyRef[];
  galleryUrls?: string[];
  tickets?: EventTicket[];
  status?: string;
};
