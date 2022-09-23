import { MOVIES, DETAILS, STATS, RATING } from "./urls";
import { get, getById, create } from "./http-methods";
import { getSessionId } from "./auth";

export const getMovies = async (page = 1, sortBy = "") => {
  return await get(`${MOVIES}?page=${page}&sort_by=${sortBy}`);
};

export const getMovieDetails = async (movieId) => {
  return await getById(DETAILS, movieId);
};

export const getStats = async () => {
  return await get(`${STATS}`);
};

export const provideRating = async (sessionId, movieId, rating) => {
  return await create(`${RATING(movieId)}?guest_session_id=${sessionId}`, {
    value: rating,
  });
};

export const rateAMovie = async (movieId, rating) => {
  const getGuestSession = await getSessionId();
  if (getGuestSession.success) {
    const sessionId = getGuestSession.sessionId;
    return provideRating(sessionId, movieId, rating);
  }
};
