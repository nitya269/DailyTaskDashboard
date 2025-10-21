import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardHeader from "./DashboardHeader";
import Footer from "./Footer";
import Task from "./Task";
import "./Report.css";

export default function Report() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/tasks");
        setTasks(res.data || []);
      } catch (err) {
        console.error("Error fetching tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  return (
    <div className="admin-dashboard-wrapper">
      <DashboardHeader currentUser={null} />
      <div className="container">
        <div className="table-header">
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
        <div className="tasks-wrapper">
          {loading ? (
            <div className="task-list-container"><div className="loading">Loading...</div></div>
          ) : (
            <Task taskType="totalTasks" tasks={tasks} showFilters={true} />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}


