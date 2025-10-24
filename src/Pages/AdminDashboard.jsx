
import "./AdminDashboard.css";
import * as XLSX from "xlsx";
import Active from "./Active";
import DashboardHeader from "./DashboardHeader";
import Footer from "./Footer";
import Task from "./Task";
import TaskAssignForm from "./TaskAssignForm";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import WeatherWidget from "../Components/WeatherWidget";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalTasks: 0,
    pendingTasks: 0,
    activeEmployees: 0
  });

  const [activePage, setActivePage] = useState("dashboard");
  const [filterCard, setFilterCard] = useState("");
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loadingCard, setLoadingCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});

  const [form, setForm] = useState({
    id: "",
    emp_code: "",
    name: "",
    email: "",
    department: "",
    position: "",
    mobile: "",
    date_of_joining: "",
  });

  const fetchEmployees = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/emp_details");
      const normalized = res.data.map(emp => {
        const uniqueId = emp.id ?? emp.emp_code ?? crypto.randomUUID();
        return {
          id: uniqueId, // Frontend ID for React keys
          db_id: emp.id, // Database ID for API calls
          emp_code: emp.emp_code ?? uniqueId,
          name: emp.name ?? "",
          email: emp.email ?? "",
          department: emp.department ?? "",
          position: emp.position ?? "",
          mobile: emp.mobile ?? "",
          date_of_joining: emp.date_of_joining ?? "",
          
        };
      });
      setEmployees(normalized);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/tasks");
      setTasks(res.data ?? []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const [statsRes, employeesRes, tasksRes] = await Promise.all([
        axios.get("http://localhost:5000/api/dashboard-stats"),
        axios.get("http://localhost:5000/api/emp_details"),
        axios.get("http://localhost:5000/api/tasks")
      ]);

      const statsData = statsRes.data || {};
      const allEmployees = employeesRes.data || [];
      const allTasks = tasksRes.data || [];

      const activeEmployees = allEmployees.filter(emp => {
        const employeeTasks = allTasks.filter(task => task.emp_code === emp.emp_code);
        return employeeTasks.length > 0 && employeeTasks.every(task => task.status === 'Completed');
      }).length;

      setStats({
        totalEmployees: allEmployees.length,
        totalTasks: allTasks.length,
        pendingTasks: allTasks.filter(task => task.status === 'Pending').length,
        activeEmployees: activeEmployees
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      setStats({
        totalEmployees: 0,
        totalTasks: 0,
        pendingTasks: 0,
        activeEmployees: 0
      });
    }
  };

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

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]);

  useEffect(() => {
    fetchEmployees();
    fetchTasks();
    fetchStats();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Mobile number validation
    if (name === 'mobile') {
      // Only allow numbers and limit to 10 digits
      const numericValue = value.replace(/\D/g, ''); // Remove non-numeric characters
      if (numericValue.length <= 10) {
        setForm({ ...form, [name]: numericValue });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!form.emp_code || !form.name || !form.email || !form.department || !form.position) {
      alert("Please fill all required fields");
      setIsSubmitting(false);
      return;
    }

    // Mobile number validation
    if (form.mobile && form.mobile.length !== 10) {
      alert("Mobile number must be exactly 10 digits");
      setIsSubmitting(false);
      return;
    }

    try {
      console.log("📤 Sending employee data:", form);
      console.log("📅 Date of joining being sent:", form.date_of_joining);
      console.log("📱 Mobile number being sent:", form.mobile);
      const res = await axios.post("http://localhost:5000/api/emp_details", form);
      console.log("📥 Received response:", res.data);
      console.log("📅 Date of joining in response:", res.data.date_of_joining);
      console.log("📱 Mobile number in response:", res.data.mobile);
      const newEmp = {
        emp_code: res.data.emp_code ?? "",
        name: res.data.name ?? "",
        email: res.data.email ?? "",
        department: res.data.department ?? "",
        position: res.data.position ?? "",
        mobile: res.data.mobile ?? "",
        date_of_joining: res.data.date_of_joining ?? "",
      };
      setEmployees(prev => [...prev, newEmp]);
      setForm({ emp_code: "", name: "", email: "", department: "", position: "", mobile: "", date_of_joining: "" });
      setActivePage("employees");
      setSuccessMessage("Employee added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      fetchStats();
    } catch (err) {
      console.error("❌ Error adding employee:", err);
      console.error("❌ Error response:", err.response?.data);
      alert(`Error adding employee: ${err.response?.data?.error || err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEmployee = async (id) => {
    console.log("🗑️ Attempting to delete employee with ID:", id);
    
    if (!id) {
      console.error("❌ No ID provided for deletion");
      alert("Error: No employee ID found for deletion");
      return;
    }
    
    if (isDeleting[id]) return; // Prevent multiple clicks
    
    const confirmDelete = window.confirm("Are you sure you want to delete this employee?");
    if (!confirmDelete) return;
    
    setIsDeleting(prev => ({ ...prev, [id]: true }));
    
    try {
      console.log("🗑️ Sending delete request for ID:", id);
      const response = await axios.delete(`http://localhost:5000/api/emp_details/${id}`);
      
      if (response.data.success) {
        console.log("✅ Employee deleted successfully:", response.data.message);
        fetchEmployees();
        fetchStats();
      } else {
        console.error("❌ Delete failed:", response.data.message);
        alert(`Error: ${response.data.message}`);
      }
    } catch (err) {
      console.error("Error deleting employee:", err);
      const errorMessage = err.response?.data?.message || "Error deleting employee. Please try again.";
      alert(errorMessage);
    } finally {
      setIsDeleting(prev => ({ ...prev, [id]: false }));
    }
  };

  const logout = () => {
    const confirmExit = window.confirm("Are you sure you want to exit?");
    if (confirmExit) {
      localStorage.removeItem('admin');
      navigate('/', { replace: true });
    }
  };

  const showDashboard = () => { setActivePage("dashboard"); setFilterCard(""); };
  const showEmployees = () => { fetchEmployees(); setActivePage("employees"); setFilterCard(""); };
  const showTasks = () => { fetchTasks(); setActivePage("tasks"); setFilterCard(""); };

  const handleCardClick = (cardKey) => {
    setFilterCard(cardKey);
    setLoadingCard(true);
    fetchTasks().finally(() => setLoadingCard(false));
  };

  const exportEmployeesToExcel = () => {
    if (employees.length === 0) {
      alert("No data to export!");
      return;
    }
    const worksheetData = employees.map(emp => ({
      "Employee ID": emp.emp_code,
      Name: emp.name,
      Email: emp.email,
      Department: emp.department,
      Position: emp.position,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `Employees_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportTasksToExcel = () => {
    if (tasks.length === 0) {
      alert("No task data to export!");
      return;
    }
    const worksheetData = tasks.map(task => ({
      "Task ID": task.id,
      Title: task.title,
      Description: task.description,
      AssignedTo: task.assigned_to,
      Status: task.status,
      DueDate: task.due_date,
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(data, `Tasks_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const activeEmployeesCount = employees.filter((emp) => {
    const empTasks = tasks.filter(
      (task) => String(task.emp_code) === String(emp.emp_code)
    );
    if (empTasks.length === 0) return false;
    return empTasks.every((task) => task.status === "Completed");
  }).length;

  const todayDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="admin-dashboard-wrapper">
      <DashboardHeader currentUser={null} />
      <div className="container">
        {/* Weather Widget - Only show on dashboard page */}
        {activePage === "dashboard" && <WeatherWidget />}

        {/* Nav bar */}
        <div className="nav-bars">
          <button
            onClick={() => { showEmployees(); setActivePage("employees"); }}
            className={`nav-btn ${activePage === "employees" ? "active" : ""}`}
          >
            Manage Employees
          </button>

          <button
            onClick={() => { showTasks(); setActivePage("tasks"); }}
            className={`nav-btn ${activePage === "tasks" ? "active" : ""}`}
          >
            Assign Tasks
          </button>

          <button
            onClick={() => { navigate('/employee-dashboard/admin'); setActivePage("viewDashboard"); }}
            className={`nav-btn ${activePage === "viewDashboard" ? "active" : ""}`}
          >
            View Employee Dashboard
          </button>

          <button
            onClick={() => { navigate('/report'); setActivePage("report"); }}
            className={`nav-btn ${activePage === "report" ? "active" : ""}`}
          >
            Report
          </button>
        </div>

        {/* Dashboard Section */}
        {activePage === "dashboard" && (
          <div className="dashboard-section">
            <h3><b>DASHBOARD</b></h3>
            <div className="stats-container">
              <div className="stat-card total-employees" onClick={() => setFilterCard("totalEmployees")}>
                <div className="stat-title">Total Employees</div>
                <div className="stat-value">{stats.totalEmployees}</div>
              </div>

              <div className="stat-card total-tasks" onClick={() => handleCardClick("totalTasks")}>
                <div className="stat-title">Total Tasks</div>
                <div className="stat-value">{stats.totalTasks}</div>
              </div>

              <div className="stat-card pending-tasks" onClick={() => handleCardClick("pendingTasks")}>
                <div className="stat-title">Pending</div>
                <div className="stat-value">{stats.pendingTasks}</div>
              </div>

              <div className="stat-card active-employees" onClick={() => handleCardClick("activeEmployees")}>
                <div className="stat-title">Active Employees</div>
                <div className="stat-value">{activeEmployeesCount}</div>
              </div>

              <div className="stat-card completed-tasks" onClick={() => handleCardClick("completedTasks")}>
                <div className="stat-title">Completed Tasks</div>
                <div className="stat-value">{tasks.filter(t => t.status === 'Completed').length}</div>
              </div>
            </div>

            {loadingCard && (
              <div className="task-list-container">
                <div className="loading">Loading...</div>
              </div>
            )}

            {filterCard === "totalEmployees" && (
              <div className="task-list-container total-employees-table">
                <h3>All Employees</h3>
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Employee Name</th>
                      <th>Designation</th>
                      <th>Department</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp, index) => (
                      <tr key={emp.id}>
                        <td>{index + 1}</td>
                        <td>{emp.name}</td>
                        <td>{emp.position || 'N/A'}</td>
                        <td>
                          <span className="department-badge">{emp.department || 'N/A'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filterCard === "totalTasks" && <div className="tasks-wrapper"><Task taskType="totalTasks" tasks={tasks} showFilters={true} /></div>}
            {filterCard === "pendingTasks" && <div className="tasks-wrapper"><Task taskType="pendingTasks" tasks={tasks} showFilters={false} /></div>}
            {filterCard === "completedTasks" && <div className="tasks-wrapper"><Task taskType="completedTasks" tasks={tasks} showFilters={false} /></div>}
            {filterCard === "activeEmployees" && <div className="active-employees-wrapper"><Active employees={employees} tasks={tasks} /></div>}
          </div>
        )}

        {/* Employees Section */}
        {activePage === "employees" && (
          <div>
            <button className="back-btn" onClick={() => setActivePage("dashboard")}>
              ← Back to Dashboard
            </button>
            <h4 className="alignments">Add New Employee</h4>
            <form onSubmit={handleSubmit} className="empform">
              <div className="form-grid">
                <div className="form-row">
                  <div className="form-field">
                    <label>Employee Code</label>
                    <input type="text" name="emp_code" placeholder="Enter employee code (e.g., DS001)" value={form.emp_code} onChange={handleChange} required disabled={isSubmitting} />
                  </div>
                  <div className="form-field">
                    <label>Employee Name</label>
                    <input type="text" name="name" placeholder="Enter employee name" value={form.name} onChange={handleChange} required disabled={isSubmitting} />
                  </div>
                  <div className="form-field">
                    <label>Email Address</label>
                    <input type="email" name="email" placeholder="Enter email address" value={form.email} onChange={handleChange} required disabled={isSubmitting} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Department</label>
                    <select name="department" value={form.department} onChange={handleChange} required disabled={isSubmitting}>
                      <option value="">Select Department</option>
                      <option value="IT">IT</option>
                      <option value="HR">HR</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Position</label>
                    <input type="text" name="position" placeholder="Enter position" value={form.position} onChange={handleChange} required disabled={isSubmitting} />
                  </div>
                  <div className="form-field">
                    <label>Mobile</label>
                    <input type="tel" name="mobile" placeholder="Enter 10-digit mobile number" value={form.mobile} onChange={handleChange} maxLength="10" required disabled={isSubmitting} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-field">
                    <label>Date of Joining</label>
                    <input type="date" name="date_of_joining" value={form.date_of_joining} onChange={handleChange} required disabled={isSubmitting} />
                  </div>
                </div>
              </div>
              <div className="form-submit">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "ADDING..." : "ADD EMPLOYEE"}
                </button>
              </div>
            </form>

            <div className="table-header">  
              <h4>Employee List</h4>
              <button className="download-btn" onClick={exportEmployeesToExcel}>⬇️ Download Excel</button>
            </div>

            <div className="employee-table-wrapper">
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Employee Code</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Position</th>
                    <th>Mobile</th>
                    <th>Date of Joining</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, index) => (
                    <tr key={emp.id || emp.emp_code || `emp-${index}`}>
                      <td>{index + 1}</td>
                      <td>{emp.emp_code}</td>
                      <td>{emp.name}</td>
                      <td>{emp.email}</td>
                      <td>{emp.department}</td>
                      <td>{emp.position}</td>
                      <td>{emp.mobile}</td>
                      <td>{emp.date_of_joining}</td>  
                      <td>
                        <button 
                          className="delete-btn" 
                          onClick={() => deleteEmployee(emp.db_id)}
                          disabled={isDeleting[emp.db_id]}
                        >
                          {isDeleting[emp.db_id] ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {activePage === "tasks" && (
          <TaskAssignForm
            activePage={activePage}
            setActivePage={setActivePage}
            tasks={tasks}
          />
        )}

        {successMessage && <div className="success-popup">{successMessage}</div>}
      </div>
      <Footer />
    </div>
  );
}
