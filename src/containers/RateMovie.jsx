import React, { useState } from "react";
import { Modal, Button } from "../components";
import { rateAMovie } from "../api/movie";
import Star from "../assets/images/Star.svg";
import "../scss/containers/_rating.scss";

const RateMovie = ({ movieId, setShow, movieTitle }) => {
  const [rating, setRating] = useState(0);
  const [disabled, setDisabled] = useState(true);

  const movieRateHandle = async () => {
    const rate = await rateAMovie(movieId, rating * 2);
    if (rate?.data?.success) {
      setShow(false);
      alert("Rating added successfully");
    } else alert("Error");
  };

  const Rating = () => {
    const onClickHandle = (index) => {
      if (index > 0) {
        setDisabled(false);
      }
      setRating(index);
    };

    const ratings = [];
    for (let index = 1; index < 6; index++) {
      ratings.push(
        <img
          src={Star}
          alt="star"
          className={`rating__star ${
            index <= rating && index !== 0 ? "rating__star--selected" : ""
          }`}
          onClick={() => onClickHandle(index)}
        />
      );
    }
    return ratings;
  };

  return (
    <div className="rating">
      <Modal setShow={() => setShow(false)}>
        <div className="rating__title">Rate--- {movieTitle} </div>
        <div className="rating__container">
          <Rating />
        </div>
        <Button label="Submit!" onClick={movieRateHandle} disabled={disabled} />
      </Modal>
    </div>
  );
};

export default RateMovie;
