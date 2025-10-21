import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000", // adjust as per your backend server
  headers: { "Content-Type": "application/json" },
});

export default API;