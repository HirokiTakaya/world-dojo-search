/** Google JWT デコード用 */
export interface DecodedToken {
  email: string;
  name: string;
  picture: string;
  exp: number;
}

export interface Review {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description?: string;
}

/** 道場 (Dojo) 型 */
export interface Dojo {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  hours: string[];
  instagram: string | null;
  place_id: string;
  distance?: number;
  rating?: number;
  user_ratings_total?: number;
  reviews?: Review[];
}

/** お気に入り (Favorite) 型 */
export interface Favorite {
  id: number;
  user: number;
  dojo: Dojo;
  created_at: string;
}
export interface ChatResponse {
  reply: string;
}