import React from "react";
import "./Footer.css";

const Footer = () => {
  return (
    <div className="footer-wrapper">
      <footer className="footers">
        <p>© {new Date().getFullYear()} Dreamstep software innovations pvt ltd | All Rights Reserved</p>
      </footer>
    </div>
  );
};

export default Footer;
