import { useState, useEffect } from "react";
import { getMovies } from "../api/movie";

const useMovie = (page = 1, sortBy) => {
  const [movies, setMovies] = useState([]);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const allMovies = await getMovies(page, sortBy);
      if (allMovies?.data?.results) {
        setMovies(allMovies.data.results);
        setPages(allMovies.data.total_pages);
      }
    };
    fetchData();
  }, [page, sortBy]);

  return [movies, pages];
};

export default useMovie;
