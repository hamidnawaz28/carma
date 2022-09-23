import React from "react";
import "../../scss/layout/_footer.scss";
import Facebook from "../../assets/images/Facebook.svg";
import Instagram from "../../assets/images/Instagram.svg";
import Linkedin from "../../assets/images/LinkedIn.svg";
import Twitter from "../../assets/images/Twitter.svg";
import Whatsapp from "../../assets/images/WhatsApp.svg";

const Footer = () => {
  return (
    <div className="footer">
      <div className="footer__icons">
        {icons.map((el, id) => {
          const { url, icon } = el;
          return (
            <a href={url} target="_blank" key={id}>
              {icon}
            </a>
          );
        })}
      </div>
      <div align="center" className="footer__copyright">
        @Copyright! All Rights Reserved 2021
      </div>
    </div>
  );
};

export default Footer;

const icons = [
  {
    icon: <img src={Facebook} alt="Facebook" />,
    url: "https://www.facebook.com/test",
  },
  {
    icon: <img src={Instagram} alt="Instagram" />,
    url: "http://www.instagram.com/test",
  },
  {
    icon: <img src={Whatsapp} alt="Whatsapp" />,
    url: "https://wa.me/qr/1233",
  },
  {
    icon: <img src={Linkedin} alt="Linkedin" />,
    url: "https://www.linkedin.com/in/test",
  },
  {
    icon: <img src={Twitter} alt="Twitter" />,
    url: "https://twitter.com/test",
  },
];
