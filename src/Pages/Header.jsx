import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Header.css"; // reuse your existing CSS

function Header() {
  const [user, setUser] = useState({ type: "guest", name: "Guest User" });

  // Update user info dynamically
  const updateUserInfo = (userName, userType) => {
    if (userType === "admin") {
      setUser({ type: "admin", name: "Admin" });
    } else if (userType === "employee") {
      setUser({ type: "employee", name: userName });
    } else {
      setUser({ type: "guest", name: "Guest User" });
    }
  };

  // Example: You can trigger login later
  // updateUserInfo("John Doe", "employee");

  return (
    <div className="header-wrapper">
      <header className="main-header">
        <div className="header-content">
        {/* Logo Section */}
     <div className="logo-section">
          <div className="logos">
              <img src="./DS logo.JPG" className="company-logoo"></img>
              <span className="company-names">Task Management System</span>
          </div>
    </div>

        {/* Navigation */}
        {/* <nav className="header-nav">
          <div className="nav-links">
            <Link to="/home">Home</Link>
            <Link to="/services">Services</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </nav> */}

        {/* User Section */}
        {/* <div className="user-section">
         

          <div className="header-buttons">
            <Link to="/login" className="btn-header">
              Login
            </Link>
            <Link to="/admin" className="btn-header btn-primary">
              Admin
            </Link>
          </div>
        </div> */}
        </div>
      </header>
    </div>
  );
}

export default Header;
