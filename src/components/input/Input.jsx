import React from "react";
import "../../scss/components/input.css";

const InputField = ({
  value,
  setValue,
  label,
  required = true,
  name,
  minLength = "3",
  maxLength = "30",
  type = "text",
  placeholder,
  ...props
}) => {
  return (
    <div className="input">
      <p className="input__label">{label}</p>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={setValue}
        required={true}
        minLength={minLength}
        maxLength={maxLength}
        {...props}
        className="input__field"
      />
    </div>
  );
};
export default InputField;
