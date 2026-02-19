/**
 * Google Places API Response Types
 * Based on: https://developers.google.com/maps/documentation/places/web-service/search
 */

export interface GooglePlaceGeometry {
  location: {
    lat: number;
    lng: number;
  };
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

export interface GooglePlaceOpeningHours {
  open_now?: boolean;
  periods?: Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }>;
  weekday_text?: string[];
}

export interface GooglePlacePhoto {
  height: number;
  width: number;
  photo_reference: string;
  html_attributions: string[];
}

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: GooglePlaceGeometry;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  opening_hours?: GooglePlaceOpeningHours;
  photos?: GooglePlacePhoto[];
  business_status?: string;
  vicinity?: string;
}

export interface GooglePlacesSearchResponse {
  results: GooglePlace[];
  status: string;
  error_message?: string;
  next_page_token?: string;
  html_attributions?: string[];
}

export interface GooglePlaceDetailsResponse {
  result: GooglePlaceDetails;
  status: string;
  error_message?: string;
  html_attributions?: string[];
}

export interface GooglePlaceDetails extends GooglePlace {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
  utc_offset?: number;
}

export enum GooglePlacesStatus {
  OK = 'OK',
  ZERO_RESULTS = 'ZERO_RESULTS',
  OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
  REQUEST_DENIED = 'REQUEST_DENIED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface GooglePlacesError extends Error {
  status: GooglePlacesStatus;
  code?: string;
}
