const urls = {
  HOME: "/",
  DETAILS: "/details",
  STATS: "/stats",
};
const MOVIE_DB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500/";

const FILTERS = [
  { label: "Popularity (Desc)", value: "popularity.desc" },
  { label: "Popularity (Asc)", value: "popularity.asc" },
  { label: "Release Date (Desc)", value: "release_date.desc" },
  { label: "Release Date (Asc)", value: "release_date.asc" },
  { label: "Revenue (Desc)", value: "revenue.desc" },
  { label: "Revenue (Asc)", value: "revenue.asc" },
  { label: "Primary Release_date (Desc)", value: "primary_release_date.desc" },
  { label: "Primary Release_date (Asc)", value: "primary_release_date.asc" },
  { label: "Original Title (Desc)", value: "original_title.desc" },
  { label: "Original Title (Asc)", value: "original_title.asc" },
  { label: "Vote Average (Desc)", value: "vote_average.desc" },
  { label: "Vote Average (Asc)", value: "vote_average.asc" },
  { label: "Vote Count (Desc)", value: "vote_count.desc" },
  { label: "Vote Count (Asc)", value: "vote_count.asc" },
];

export { urls, MOVIE_DB_IMAGE_BASE, FILTERS };
