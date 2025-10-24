//employee dashboard
import "../App.css";
import "./EmployeeDashboard.css";
import * as XLSX from "xlsx";
import DashboardHeader from "./DashboardHeader";
import Footer from "./Footer";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import { useNavigate, useParams } from "react-router-dom";
import WeatherWidget from "../Components/WeatherWidget";

function EmployeeDashboard() {
  const navigate = useNavigate();
  const { empCode } = useParams();
  const API_BASE = "http://localhost:5000/api";
  // Check if this is admin viewing from admin dashboard (not employee's own dashboard)
  const isAdminView = empCode === "admin" && !!JSON.parse(localStorage.getItem("admin"));

  // Timezone helpers (IST)
  const TZ = "Asia/Kolkata";
  const formatISTDate = (dateLike) =>
    new Intl.DateTimeFormat("en-IN", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ }).format(new Date(dateLike));
  const formatISTDateTime = (dateLike) => {
    const date = new Date(dateLike);
    const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    const day = String(istDate.getDate()).padStart(2, '0');
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const year = istDate.getFullYear();
    return `${day}-${month}-${year}`;
  };
  const getISTYMD = (dateLike) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(new Date(dateLike));
    const y = Number(parts.find((p) => p.type === "year").value);
    const m = Number(parts.find((p) => p.type === "month").value) - 1; // 0-index
    const d = Number(parts.find((p) => p.type === "day").value);
    return { y, m, d };
  };

  const [emp, setEmp] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmpCode, setSelectedEmpCode] = useState("");
  const [completedDates, setCompletedDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(formatISTDate(new Date()));
  const [showPopup, setShowPopup] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [taskFilter, setTaskFilter] = useState("All");

  const [form, setForm] = useState({
    emp_code: "",
    project: "",
    module: "",
    submodule: "",
    task_details: "",
    assigned_from: "",
    status: ""
  });

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Back button confirmation
  useEffect(() => {
    const handlePopState = () => {
      const confirmExit = window.confirm("Are you sure you want to exit?");
      if (confirmExit) {
        localStorage.clear();
        navigate("/", { replace: true });
      } else {
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);
  //color for that status
  const getStatusColor = (status) => {
  switch (status) {
    case "Pending":
      return "#FF6B6B"; // vivid coral red
    case "In Progress":
      return "#FFD93D"; // rich golden yellow
    case "Completed":
      return "#4CAF50"; // strong green
    default:
      return "white";
  }
};




  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/tasks`);
      const allTasks = res.data || [];

      const empStorage = JSON.parse(localStorage.getItem("employee")) || { emp_code: empCode };
      const admStorage = JSON.parse(localStorage.getItem("admin"));

      let filtered = [];

      if (isAdminView) {
        // Admin viewing from admin dashboard
        if (selectedEmpCode) {
          filtered = allTasks.filter(
            (task) => task.emp_code?.toUpperCase() === selectedEmpCode.toUpperCase()
          );
        } else if (admStorage) {
          const adminCode = (admStorage.emp_code || "").toUpperCase();
          const adminUser = (admStorage.username || "").toUpperCase();
          filtered = allTasks.filter((task) => {
            const from = (task.assigned_from || "").toUpperCase();
            return from === adminCode || from === adminUser;
          });
        }
      } else {
        // Employee viewing their own dashboard or admin logged in as employee
        const currentEmpCode = empCode || empStorage?.emp_code;
        if (currentEmpCode) {
          filtered = allTasks.filter(
            (task) =>
              task.emp_code?.toUpperCase() === currentEmpCode.toUpperCase() ||
              task.assigned_from?.toUpperCase() === currentEmpCode.toUpperCase()
          );
        }
      }

      setTasks(filtered);
      setFilteredTasks(filtered);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/projects`);
      setProjects(res.data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  // Fetch employees (only for admin view)
  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE}/emp_details`);
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  // Fetch employee details (skip for generic admin view)
  useEffect(() => {
    if (!empCode || isAdminView) return;
    const fetchEmployeeDetails = async () => {
      try {
        const res = await axios.get(`${API_BASE}/employees/${empCode}`);
        setEmp(res.data);
      } catch (err) {
        console.error("Error fetching employee details:", err);
      }
    };
    fetchEmployeeDetails();
  }, [empCode, isAdminView]);

  // Initial fetch
  useEffect(() => {
    fetchProjects();
    if (empCode) fetchTasks();
    if (isAdminView) fetchEmployees();
  }, [empCode]);

  // Refresh tasks when admin changes selected employee filter
  useEffect(() => {
    if (isAdminView) {
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmpCode]);

  // Filter tasks by selected date (IST)
  useEffect(() => {
    const byDate = tasks.filter(
      (t) => formatISTDate(t.created_at) === selectedDate
    );
    setFilteredTasks(byDate);
  }, [tasks, selectedDate]);

  // Form change
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Task submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const admin = JSON.parse(localStorage.getItem("admin"));
    const employee = JSON.parse(localStorage.getItem("employee"));
    
    // Determine if this is truly an admin view (admin accessing from admin dashboard)
    const isRealAdminView = empCode === "admin" && admin;
    
    // For employee's own dashboard, use their empCode from URL params
    // For admin view, use selectedEmpCode if available
    let targetEmpCode;
    let assignedFrom;
    
    if (isRealAdminView) {
      // Admin is assigning task to selected employee
      targetEmpCode = selectedEmpCode;
      assignedFrom = admin?.emp_code || admin?.name || "admin";
      
      if (!targetEmpCode) {
        alert("Please select an employee to assign the task.");
        setSubmitting(false);
        return;
      }
    } else {
      // Employee is adding their own task/report
      targetEmpCode = empCode;
      assignedFrom = empCode || employee?.emp_code || "self";
    }

    const payload = {
      emp_code: targetEmpCode,
      project: form.project,
      module: form.module,
      submodule: form.submodule,
      task_details: form.task_details,
      assigned_from: assignedFrom,
      status: "Pending",
      date: selectedDate,
      created_at: new Date().toISOString()
    };

    try {
      await axios.post(`${API_BASE}/tasks`, payload);
      setSuccess(true);
      setForm({ emp_code: "", project: "", module: "", submodule: "", task_details: "" });
      if (isRealAdminView) setSelectedEmpCode("");
      setTimeout(() => setSuccess(false), 2500);
      fetchTasks();
    } catch (err) {
      alert("Error assigning task!");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Status change
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await axios.put(`${API_BASE}/tasks/${taskId}/status`, { status: newStatus });
      fetchTasks();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status. Try again.");
    }
  };

  // Delete logic
  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setShowPopup(true);
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`${API_BASE}/tasks/${taskId}`);
      alert("Task deleted successfully!");
      fetchTasks();
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task.");
    }
  };

  // Excel export
  const exportToExcel = () => {
    const displayedTasks = taskFilter === "All"
      ? filteredTasks
      : filteredTasks.filter(t => t.status === taskFilter);

    if (displayedTasks.length === 0) {
      alert("No tasks to export!");
      return;
    }

    const worksheetData = displayedTasks.map((task) => ({
      "Task ID": task.task_id,
      "Employee Code": task.emp_code,
      "Employee Name": task.emp_name,
      Project: task.project,
      Module: task.module,
      //Submodule: task.submodule,
      "Task Details": `${task.submodule || ""} --- ${task.task_details || ""}`,
      "Assigned From": task.assigned_from,
      "Assigned At": formatISTDateTime(task.created_at),
      Status: task.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `Tasks_${empCode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Calendar
  const [currentMonth, setCurrentMonth] = useState(currentTime.getMonth());
  const [currentYear, setCurrentYear] = useState(currentTime.getFullYear());
  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const holidays = [
    new Date(currentYear, currentMonth, 5).toLocaleDateString(),
    new Date(currentYear, currentMonth, 15).toLocaleDateString(),
    new Date(currentYear, currentMonth, 25).toLocaleDateString()
  ];

  const generateMonthGrid = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const weeks = [];
    let week = [];
    for (let i = 0; i < firstDay; i++) week.push(null);
    for (let d = 1; d <= lastDate; d++) {
      week.push(d);
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    while (week.length > 0 && week.length < 7) week.push(null);
    if (week.length > 0) weeks.push(week);
    return weeks;
  };

  // Task counts
  const totalTasks = filteredTasks.length;
  const pendingTasks = filteredTasks.filter(t => t.status === "Pending").length;
  const inProgressTasks = filteredTasks.filter(t => t.status === "In Progress").length;
  const completedTasks = filteredTasks.filter(t => t.status === "Completed").length;

  const displayedTasks = taskFilter === "All"
    ? filteredTasks
    : filteredTasks.filter(t => t.status === taskFilter);

  return (
    <div className="employee-dashboard-wrapper">
      <DashboardHeader currentUser={emp} />
      <WeatherWidget />
      <div className="employee-dashboard-container">
        <button className="back-btn" onClick={() => (isAdminView ? navigate('/admin-dashboard') : navigate(-1))}>← Back</button>

        {/* Top row: Task Summary Cards */}
        <div className="top-row">
          <div className="task-summary-cards">
            <div
              className={`summary-card total ${taskFilter === "All" ? "active" : ""}`}
              onClick={() => setTaskFilter("All")}
            >
              <h4>Total Tasks</h4>
              <p>{totalTasks}</p>
            </div>

            <div
              className={`summary-card in-progress ${taskFilter === "In Progress" ? "active" : ""}`}
              onClick={() => setTaskFilter("In Progress")}
            >
              <h4>In Progress</h4>
              <p>{inProgressTasks}</p>
            </div>

            <div
              className={`summary-card pending ${taskFilter === "Pending" ? "active" : ""}`}
              onClick={() => setTaskFilter("Pending")}
            >
              <h4>Pending</h4>
              <p>{pendingTasks}</p>
            </div>

            <div
              className={`summary-card completed ${taskFilter === "Completed" ? "active" : ""}`}
              onClick={() => setTaskFilter("Completed")}
            >
              <h4>Completed</h4>
              <p>{completedTasks}</p>
            </div>
          </div>
        </div>

        {/* Middle section: Add Report Form + Calendar side by side */}
        <div className="middle-section">
          {/* Task Form */}
          <div className="form-container">
            <h3>Add Report</h3>
            <form className="task-form" onSubmit={handleSubmit}>
              <div className="form-row">
                {isAdminView && (
                  <div className="form-group">
                    <h5 className="style">Employee:</h5>
                    <select name="emp_code" value={selectedEmpCode} onChange={(e) => setSelectedEmpCode(e.target.value)} required>
                      <option value="">-- Select Employee --</option>
                      {employees.map((em) => (
                        <option key={em.emp_code || em.id} value={em.emp_code}>{em.name} ({em.emp_code})</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <h5 className="style">Project:</h5>
                  <select name="project" value={form.project} onChange={handleChange} required>
                    <option value="">-- Select Project --</option>
                    {projects.map((proj) => (
                      <option key={proj.project_id} value={proj.project_name}>
                        {proj.project_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <h5 className="style">Module:</h5>
                  <select name="module" value={form.module} onChange={handleChange} required>
                    <option value="">-- Select Module --</option>
                    <option value="Module 1">Module 1</option>
                    <option value="Module 2">Module 2</option>
                    <option value="Module 3">Module 3</option>
                  </select>
                </div>
                <div className="form-group">
                    <h5 className="sub-style">Submodule:</h5>
                    <input
                      type="text"
                      name="submodule"
                      value={form.submodule}
                      onChange={handleChange}
                      placeholder="Enter submodule"
                      required
                    />
                  </div>
              </div>
              <div className="form-row">
                <div className="form-group full-width">
                  <h5 className="rem-style">Remarks:</h5>
                  <textarea
                    name="task_details"
                    value={form.task_details}
                    onChange={handleChange}
                    placeholder="Enter task details here..."
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Submit"}
                </button>
              </div>
            </form>
            {success && <div className="popup">✅ Task added successfully!</div>}
          </div>

          {/* Calendar - moved to be side by side with form */}
          <div className="calendar-section card">
            <div className="calendar-header">
              <button onClick={prevMonth}>&lt;</button>
              <span>
                {new Date(currentYear, currentMonth).toLocaleString("default", { month: "long", year: "numeric" })}
              </span>
              <button onClick={nextMonth}>&gt;</button>
            </div>
            <div className="calendar-weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="calendar-weekday">{d}</div>
              ))}
            </div>
            <div className="calendar-grid">
              {generateMonthGrid(currentMonth, currentYear).map((week, i) => (
                <div key={i} className="calendar-week">
                  {week.map((day, idx) => {
                    if (!day) return <div key={idx} className="calendar-day empty"></div>;

                    const dateOfDay = new Date(currentYear, currentMonth, day);
                    const dateStr = formatISTDate(dateOfDay);
                    const isToday =
                      day === currentTime.getDate() &&
                      currentMonth === currentTime.getMonth() &&
                      currentYear === currentTime.getFullYear();
                    const istToday = getISTYMD(new Date());
                    const isFuture = new Date(currentYear, currentMonth, day) > new Date(istToday.y, istToday.m, istToday.d);

                    const isCompleted = completedDates.includes(dateStr);
                    const isHoliday = holidays.includes(dateStr);

                    let className = "calendar-day";
                    if (isCompleted) className += " completed";
                    else if (isHoliday) className += " holiday";
                    else className += " pending";
                    if (isToday) className += " today";
                    if (dateStr === selectedDate) className += " selected";
                    if (isFuture) className += " disabled";

                    return (
                      <div
                        key={idx}
                        className={className}
                        onClick={!isFuture ? () => setSelectedDate(dateStr) : undefined}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Excel Download */}
        <div className="excel-header">
          <button className="exceldownload-btn" onClick={exportToExcel}>
            ⬇️ Download Excel
          </button>
        </div>

        {/* Task Table */}
        <div className="task-list-containers">
          <div className="task-table-header">
            <h3>Assigned Tasks</h3>
          </div>

          <table className="task-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Project</th>
                <th>Module</th>

                <th>Task Details</th>
                <th>Assigned At</th>
                <th>Assigned From</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedTasks.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center" }}>No tasks found</td>
                </tr>
              ) : (
                displayedTasks.map((task, index) => (
                  <tr key={index}>
                    <td>{task.task_id}</td>
                    <td>{task.emp_name} ({task.emp_code})</td>
                    <td>{task.project}</td>
                    <td>{task.module}</td>
                    <td>{task.submodule}-{task.task_details}</td>
                    <td>
                      <span
                        className="link-like"
                        onClick={() => {
                          const { y, m } = getISTYMD(task.created_at);
                          setSelectedDate(formatISTDate(task.created_at));
                          setCurrentMonth(m);
                          setCurrentYear(y);
                        }}
                      >
                        {formatISTDateTime(task.created_at)}
                      </span>
                    </td>
                    <td>{task.assigned_from}</td>
                    <td>
                      <select
                        value={task.status || "Pending"}
                        onChange={(e) => handleStatusChange(task.task_id, e.target.value)}
                        style={{ backgroundColor: getStatusColor(task.status || "Pending") }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>

                    <td>
                      <button className="delete-btn" onClick={() => handleDeleteClick(task)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Delete Confirmation Popup */}
        {showPopup && (
          <div className="modal-overlay">
            <div className="modal-content">
              <span
                className="modal-close"
                onClick={() => {
                  setShowPopup(false);
                  setConfirmDelete(false);
                }}
              >
                ❌
              </span>
              <h3 style={{ color: "red" }}>Do you want to delete this task?</h3>
              <p><strong>{taskToDelete?.task_details}</strong></p>
              <label>
                <input
                  type="checkbox"
                  checked={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.checked)}
                />
                Yes, I want to delete
              </label>
              <div className="modal-actions">
                <button
                  className="delete-btn"
                  disabled={!confirmDelete}
                  onClick={() => {
                    deleteTask(taskToDelete.task_id);
                    setShowPopup(false);
                    setConfirmDelete(false);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default EmployeeDashboard;
