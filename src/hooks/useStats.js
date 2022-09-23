import { useState, useEffect } from "react";
import { getStats } from "../api/movie";

const useMoviesStats = (page = 1, search = "") => {
  const [moviesStats, setMoviesStats] = useState([]);

  const fetchData = async () => {
    const stats = await getStats();
    if (stats?.data?.results) {
      setMoviesStats(stats.data.results);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {}, [search]);

  return moviesStats.splice(0, 10);
};

export default useMoviesStats;
