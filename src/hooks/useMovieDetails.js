import { useState, useEffect } from "react";
import { getMovieDetails } from "../api/movie";

const useMovieDetails = (movieId, page = 1, search = "") => {
  const [movieDetails, setMoviesDetails] = useState([]);

  const fetchData = async () => {
    const details = await getMovieDetails(movieId);
    if (details?.data) {
      setMoviesDetails(details.data);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {}, [search]);

  return movieDetails;
};

export default useMovieDetails;
