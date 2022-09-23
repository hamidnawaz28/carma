import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { MovieCard, Pagination, Select } from "../../components";
import { useMovie } from "../../hooks";
import { updatePage } from "../../redux/actions";
import { FILTERS } from "../../utils/constants";
import "../../scss/pages/_home.scss";

const Home = () => {
  const { page } = useSelector((data) => data.movies);
  const [filter, setFilter] = useState("popularity.desc");
  const [movies, pages] = useMovie(page, filter);

  const dispatch = useDispatch();

  return (
    <div>
      <div className="user-search">
        <Select
          value={filter}
          setValue={(e) => setFilter(e.target.value)}
          options={FILTERS}
        />
      </div>
      <MovieCard movies={movies} pages={pages} page={page} />
      <Pagination
        page={page}
        pages={pages}
        setPage={(newPage) => dispatch(updatePage(newPage))}
      />
    </div>
  );
};

export default Home;
