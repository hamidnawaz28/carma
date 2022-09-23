import React from "react";
import { Button } from "../button";
import { urls } from "../../utils/constants";

import "../../scss/layout/_header.scss";

const Header = () => {
  return (
    <div className="header">
      <a href={urls.HOME} className="header__logo">
        <div>MovieDB</div>
      </a>
      <a href={urls.STATS} className="header__logo">
        <Button label={"Stats"} />
      </a>
    </div>
  );
};

export default Header;
