export interface Message {
  message: string;
  date: string;
  from: string;
  to: string;
  timestamp?: string; // Optional timestamp property for sorting
  // Add any other properties your Message model requires
}