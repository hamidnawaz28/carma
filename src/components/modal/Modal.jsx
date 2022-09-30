import React from "react";
import CloseIcon from "../../assets/images/Close.svg";
import "../../scss/components/modal.css";

const Modal = ({ children, setShow }) => {
  return (
    <div className="modal__wrap">
      <div className="modal">
        <div className="modal__close-wrap">
          <div className="modal__close-wrap__close" onClick={setShow}>
            <img src={CloseIcon} alt="" />
          </div>
        </div>
        <div className="modal__content">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
