import React from "react";
import { Link } from "react-router-dom";
import { MOVIE_DB_IMAGE_BASE } from "../../utils/constants";

import Users from "../../assets/images/Users.svg";
import Trending from "../../assets/images/Trending.svg";
import Star from "../../assets/images/Star.svg";
import "../../scss/components/movie-card.css";

const MovieCard = ({ movies }) => {
  return (
    <div className="movies-container">
      {movies?.map((movie) => {
        return (
          <Link
            to={`/details/${movie.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="movie">
              <div className="movie__poster-path">
                <img
                  src={`${MOVIE_DB_IMAGE_BASE}${movie.poster_path}`}
                  alt={movie.title}
                  width="100%"
                />
              </div>
              <div className="movie__details">
                <div className="movie__header">
                  <div className="movie__id">{movie.id}</div>
                  <div className="movie__release-date">
                    {movie.release_date}
                  </div>
                </div>
                <div className="movie__title">{movie.title}</div>
                <div>
                  <div className="movie__popularity movie__figures">
                    <img src={Trending} alt="" />
                    <div>{movie.popularity}</div>
                  </div>
                  <div className="movie__vote-average movie__figures">
                    <img src={Star} alt="" />
                    <div>{movie.vote_average}</div>
                  </div>
                  <div className="movie__vote-count movie__figures">
                    <img src={Users} alt="" />
                    <div>{movie.vote_count}</div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

export default MovieCard;
