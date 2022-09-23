import React from "react";
import "../../scss/components/_select.scss";

const Select = ({ value, setValue, options }) => {
  return (
    <div className="select">
      <select
        className="select__input"
        value={value}
        onChange={(e) => {
          setValue(e);
        }}
      >
        {options.map((option) => (
          <option value={option.value} className="selection__option">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
