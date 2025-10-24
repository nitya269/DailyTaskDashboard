import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DashboardHeader from "./DashboardHeader";
import Footer from "./Footer";
import Task from "./Task";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import './Report.css';


export default function Report() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleTasks, setVisibleTasks] = useState([]);

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
    <>
      <DashboardHeader currentUser={null} />
      <div className="container">
        <div className="table-header">
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
          <button className="download-btn" style={{ backgroundColor: '#28a745' }} onClick={() => {
            const rows = (visibleTasks.length ? visibleTasks : tasks).map((t, index) => ({
              "S.No": index + 1,
              Name: t.emp_name,
              Project: t.project,
              Module: t.module,
              "Task Details": `${t.submodule || ""} - ${t.task_details || ""}`,
              Date: (() => { const d = t.created_at ? new Date(t.created_at) : null; if (!d) return ""; const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000); return ist.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }); })(),
              Status: t.status
            }));
            if (rows.length === 0) { alert("No tasks to export!"); return; }
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Report");
            const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([buf], { type: "application/octet-stream" });
            saveAs(blob, `Report_${new Date().toISOString().slice(0,10)}.xlsx`);
          }}></button>
        </div>
        <div className="tasks-wrapper">
          {loading ? (
            <div className="task-list-container"><div className="loading">Loading...</div></div>
          ) : (
            <Task taskType="totalTasks" tasks={tasks} showFilters={true} onFilteredChange={setVisibleTasks} />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}


