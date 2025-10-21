import React from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardHeader.css"; 
import { useEffect, useState } from "react";// we'll add styling here

export default function DashboardHeader({ currentUser }) {
  const navigate = useNavigate();
  const [empDetails, setEmpDetails] = useState(null);

//   useEffect(() => {
//  const empData = JSON.parse(localStorage.getItem("employee"));
//   if (empData) {
//     setEmpDetails(empData);
//   }
// }, []);


 useEffect(() => {
    // Try to get employee first
    let userData = JSON.parse(localStorage.getItem("employee"));

    // If no employee, try admin
    if (!userData) {
      userData = JSON.parse(localStorage.getItem("admin"));
    }

    if (userData) {
      setEmpDetails(userData);
    }
  }, []);

  const handleLogout = () => {
  const confirmExit = window.confirm("Are you sure you want to exit?");
  if (confirmExit) {
    localStorage.clear(); // clear session
    navigate("/", { replace: true }); // go to login
  }
  // else do nothing, stay on dashboard
};

  return (
    <div className="dashboard-header-wrapper">
      <header className="header-container">
  {/* Left: Company Logo */}
  <div className="header-left">
    <div className="logo">
      <img src="/DS logo.JPG" alt="Company Logo" className="company-logo" />
      <div className="company-title">
        <span className="company-name">Task Management System</span>
        {/* Centered employee info */}
     {/* {currentUser && (
  <div className="employee-info">
    {currentUser.name}({currentUser.emp_code}) - {currentUser.position} */}
    {/* Employee/Admin Info */}
            {(currentUser || empDetails) && (
              <div className="employee-info">
                {currentUser?.name || empDetails?.name} (
                {currentUser?.emp_code || empDetails?.emp_code}){" "}
                - {currentUser?.position || empDetails?.position}
  </div>
)}
      </div>
    </div>
  </div>

  {/* Right: User info + Logout */}
  <div className="header-right">
    <button className="logout-btn" onClick={handleLogout}>
      Logout
    </button>
  </div>
</header>
    </div>
  );
}
