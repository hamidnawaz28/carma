import React from "react";
import "../../scss/components/button.css";

const Button = ({ label, onClick, disabled = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={disabled ? "--disabled" : ""}
    >
      {label}
    </button>
  );
};
export default Button;
