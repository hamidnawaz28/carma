import React from "react";
import ArrowForward from "../../assets/images/ArrowForward.svg";
import ArrowBackward from "../../assets/images/ArrowBackward.svg";
import "../../scss/components/pagination.css";

const Pagination = ({ page, pages, setPage }) => {
  const clickHandle = (event) => {
    const { name } = event.target;
    let newPage = page;
    if (name === "forward" && page !== pages) {
      newPage = page + 1;
    } else if (name === "backward" && page !== 1) newPage = page - 1;
    setPage(newPage);
  };

  return (
    <div>
      <div className="pagination">
        <div className="pagination__control">
          <div>
            <img
              src={ArrowBackward}
              alt="arrow-backward"
              onClick={clickHandle}
              name="backward"
            />
          </div>
          <div>
            <img
              src={ArrowForward}
              alt="arrow-forward"
              onClick={clickHandle}
              name="forward"
            />
          </div>
        </div>
        <div className="pagination__data">
          <div>{page}</div>
          <div>of</div>
          <div>{pages}</div>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
