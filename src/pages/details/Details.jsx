import React, { useState } from "react";
import { useMovieDetails } from "../../hooks";
import { useParams } from "react-router-dom";
import { Button } from "../../components";
import { MOVIE_DB_IMAGE_BASE } from "../../utils/constants";
import { RateMovie } from "../../containers";
import "../../scss/pages/details.css";

import Bill from "../../assets/images/Bill.svg";
import Moneybag from "../../assets/images/Moneybag.svg";
import Users from "../../assets/images/Users.svg";
import Trending from "../../assets/images/Trending.svg";
import Star from "../../assets/images/Star.svg";
import Clock from "../../assets/images/Clock.svg";

const Details = () => {
  const { movieId } = useParams();
  const movieDetails = useMovieDetails(movieId);
  const [show, setShow] = useState(false);

  return (
    <div className="details">
      <div className="details__container">
        <div className="details__poster-path">
          <img
            src={`${MOVIE_DB_IMAGE_BASE}${movieDetails.poster_path}`}
            alt={movieDetails.title}
            width="100%"
            className="poster"
          />
          <img
            src={`${MOVIE_DB_IMAGE_BASE}${movieDetails.backdrop_path}`}
            alt={movieDetails.title}
            width="100%"
            className="backdrop"
          />
        </div>
        <div className="details__data">
          <div className="details__tag-date">
            <div className="details__tagline">{movieDetails?.tagline}</div>
            {movieDetails?.status === "Released" && (
              <div className="details__released">
                <div>Released On:</div>
                <div>{movieDetails?.release_date}</div>
              </div>
            )}
          </div>
          <div className="details__headline">
            <div className="details__title">{movieDetails?.title}</div>
            <div className="details__language">
              {movieDetails?.original_language}
            </div>
          </div>
          <div className="details__overview">{movieDetails?.overview}</div>
          <div className="details__indicators">
            <div>
              <img src={Bill} alt="" />
              <div>{movieDetails?.budget}</div>
            </div>
            <div>
              <img src={Moneybag} alt="" />
              <div>{movieDetails?.revenue}</div>
            </div>
          </div>
          {movieDetails?.runtime && (
            <div className="details__runtime">
              <img src={Clock} alt="" />
              <div>
                {movieDetails?.runtime} {" minutes"}
              </div>
            </div>
          )}

          <div>
            <div className="movie__popularity movie__figures">
              <img src={Trending} alt="" />
              <div>{movieDetails.popularity}</div>
            </div>
            <div className="movie__vote-average movie__figures">
              <img src={Star} alt="" />
              <div>{movieDetails.vote_average}</div>
            </div>
            <div className="movie__vote-count movie__figures">
              <img src={Users} alt="" />
              <div>{movieDetails.vote_count}</div>
            </div>
          </div>
          {movieDetails?.status && (
            <div className="details__status">
              <div>Status:</div>
              <div>{movieDetails?.status}</div>
            </div>
          )}

          <div className="details__rate-movie">
            <Button label="Rate the movie!" onClick={() => setShow(true)} />
          </div>
        </div>
      </div>
      {show && (
        <RateMovie
          movieId={movieId}
          setShow={setShow}
          movieTitle={movieDetails.title}
        />
      )}
    </div>
  );
};

export default Details;
