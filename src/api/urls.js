export const BASE_URL = "https://api.themoviedb.org/3/";
export const AUTHENTICATE = "authentication/guest_session/new";
export const MOVIES = `discover/movie`;
export const DETAILS = `movie`;
export const STATS = `/movie/top_rated`;
export const RATING = (movieId) => `/movie/${movieId}/rating`;
export const AUTH_TOKEN = "/authentication/token/new";
