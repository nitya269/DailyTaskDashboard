import CryptoJS from "crypto-js";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [err, setErr] = useState("");
  const [usernameErr, setUsernameErr] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMobileLogin, setShowMobileLogin] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTime, setResendTime] = useState(30);
  const [otpSuccess, setOtpSuccess] = useState("");

  const nav = useNavigate();

  // Disable browser back
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // OTP countdown
  useEffect(() => {
    let interval;
    if (otpSent && resendTime > 0)
      interval = setInterval(() => setResendTime((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [otpSent, resendTime]);

  // Reset transient messages when switching login mode
  useEffect(() => {
    setErr("");
    setUsernameErr("");
    setOtpSuccess("");
    setOtp(["", "", "", ""]);
    setOtpSent(false);
    setResendTime(30);
  }, [showMobileLogin]);

  const handleUsernameChange = (e) => {
    const value = e.target.value.toUpperCase();
    setUsername(value);
    const usernamePattern = /^DS\d{3}$/;
    setUsernameErr(usernamePattern.test(value) ? "" : "Invalid username.");
  };

  const handleMobileChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,10}$/.test(value)) {
      setMobile(value);
      setOtpSuccess("");
      if (value.length < 10 && value.length > 0)
        setErr("Mobile number must be 10 digits");
      else setErr("");
    }
  };

  const handleOtpChange = (index, value) => {
    if (/^\d?$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      if (value && index < 3) document.getElementById(`otp-${index + 1}`).focus();
      if (!value && index > 0) document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  async function submit(e) {
    e.preventDefault();
    setErr("");

    if (showMobileLogin) {
      if (otp.some((digit) => !digit)) {
        setErr("Please enter the 4-digit OTP");
        return;
      }
      return; // (placeholder for OTP verification)
    }

    const usernamePattern = /^DS\d{3}$/;
    if (!usernamePattern.test(username)) {
      setErr("Invalid username format");
      return;
    }

    if (!username || !password) {
      setErr("Please enter both username and password");
      return;
    }

    if (usernameErr) {
      setErr("Please enter the correct username");
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      const hashedPassword = CryptoJS.SHA256(password).toString();
      const res = await axios.post("http://localhost:5000/api/login", {
        username,
        password: hashedPassword,
      });

      const data = res.data;

      if (data.success) {
        const role = data.role?.toLowerCase();
        const user = data.user;

        localStorage.setItem("role", role);

        if (role === "admin") {
          localStorage.setItem(
            "admin",
            JSON.stringify({
              emp_code: user.emp_code,
              name: user.name,
              position: user.position,
            })
          );
          nav("/admin-dashboard");
        } else if (role === "employee") {
          if (user?.emp_code) {
            nav(`/employee-dashboard/${user.emp_code}`);
          } else setErr("Unknown role. Contact admin.");
        } else setErr(data.message || "Login failed");
      }
    } catch (error) {
      console.error(error);
      setErr(error?.response?.data?.message || "Server error");
    } finally {
      setLoading(false);
    }
  }

  const sendOtp = () => {
    if (!mobile || mobile.length !== 10) {
      setErr("Enter valid 10-digit mobile number");
      setOtpSuccess("");
      return;
    }
    setOtpSent(true);
    setResendTime(30);
    setOtpSuccess("OTP sent successfully to your registered mobile number");
    setTimeout(() => setOtpSuccess(""), 3000);
  };

  return (
    <div className="admin-login-wrapper min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 sm:p-8 transition-all duration-300">
        {/* Company Title */}
        <div className="mb-4 w-full">
          <div className="text-center -ml-4">
            <h2 className="text-[11px] sm:text-[13px] font-semibold text-indigo-700 whitespace-nowrap">
              Dreamstep Software Solutions
            </h2>
            <h4 className="text-[9px] sm:text-[10px] text-gray-600 whitespace-nowrap px-1">
              Employee Login – Task Management System
            </h4>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex justify-center mb-6">
          <button
            className={`px-4 py-2 rounded-l-lg font-medium ${
              !showMobileLogin
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setShowMobileLogin(false)}
          >
            Employee ID
          </button>
          <button
            className={`px-4 py-2 rounded-r-lg font-medium ${
              showMobileLogin
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setShowMobileLogin(true)}
          >
            Mobile OTP
          </button>
        </div>

        {/* Employee ID Login */}
        {!showMobileLogin && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="Enter Your Employee ID"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {usernameErr && (
                <p className="text-red-500 text-xs mt-1">{usernameErr}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-16 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-indigo-600 hover:underline"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 accent-indigo-600" />
                Remember me
              </label>
              <a href="#" className="text-indigo-600 hover:underline">
                Forgot password?
              </a>
            </div>

            {err && <p className="text-red-500 text-sm text-center">{err}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? "Loading..." : "Login"}
            </button>
          </form>
        )}

        {/* Mobile OTP Login */}
        {showMobileLogin && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={handleMobileChange}
                placeholder="Enter mobile number"
                maxLength="10"
                readOnly={otpSent}
                className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none ${
                  otpSent ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                }`}
              />
              {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
              {otpSuccess && (
                <p className="text-green-600 text-xs mt-1">{otpSuccess}</p>
              )}
            </div>

            {otpSent && (
              <div>
                <p className="text-sm mb-2">Enter 4-Digit OTP</p>
                <div className="flex justify-between max-w-xs mx-auto mb-2">
                  {otp.map((o, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      maxLength="1"
                      value={o}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      className="w-12 h-12 border border-gray-300 rounded-lg text-center text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  ))}
                </div>
                <p
                  className={`text-sm text-center ${
                    resendTime > 0
                      ? "text-gray-500"
                      : "text-indigo-600 cursor-pointer hover:underline"
                  }`}
                  onClick={() => resendTime <= 0 && sendOtp()}
                >
                  {resendTime > 0
                    ? `Resend OTP in ${resendTime}s`
                    : "Resend OTP"}
                </p>
              </div>
            )}

            <button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition"
              onClick={otpSent ? submit : sendOtp}
              disabled={mobile.length !== 10}
            >
              {otpSent ? "Login" : "Send OTP"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
