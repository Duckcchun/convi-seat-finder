export interface Store {
  id: string;
  name: string;
  address: string;
  hasSeating: "yes" | "no" | "unknown";
  lastUpdated: string;
  reportedBy?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  available_seats: number;
  total_seats: number;
}

export interface StoreFormData {
  name: string;
  address: string;
  hasSeating: "yes" | "no" | "unknown";
  reporterName: string;
  notes: string;
  latitude?: number;
  longitude?: number;
}

export interface ConvenienceStoreSearchResult {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string;
  x: string; // longitude
  y: string; // latitude
  phone?: string;
}

export interface StoreSelectInfo {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}