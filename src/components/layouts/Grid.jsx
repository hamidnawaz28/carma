import React from "react";
import "../../scss/layout/_grid.scss";

const Grid = ({ children }) => {
  return <div className="grid">{children}</div>;
};

export default Grid;
