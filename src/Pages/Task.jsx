import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./TaskAssignForm.css";

function Task(props) {
  const [tasks, setTasks] = useState(Array.isArray(props.tasks) ? props.tasks : []);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [statuses, setStatuses] = useState([]); // ✅ NEW: Dynamic statuses
  
  // Filter state
  const [filter, setFilter] = useState({
    employee: "",
    project: "",
    status: "",
    fromDate: "",
    toDate: "",
    search: ""
  });

  // Initialize from props if provided, otherwise fetch
  useEffect(() => {
    if (Array.isArray(props.tasks) && props.tasks.length >= 0) {
      setTasks(props.tasks);
      setFilteredTasks(props.tasks);
    } else {
      fetchTasks();
    }
  }, [props.tasks]);

  const fetchTasks = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/tasks");
      setTasks(res.data);
      setFilteredTasks(res.data);
    } catch (err) {
      console.error("Error fetching tasks", err);
    }
  };

  // ✅ UPDATED: Cascading filters for Employee → Project → Status
  useEffect(() => {
    if (props.showFilters) {
      // Always show all employees
      const uniqueEmployees = Array.from(new Set(tasks.map(t => t.emp_name))).filter(Boolean);
      setEmployees(uniqueEmployees);

      // Filter based on current selections
      let relevantTasks = tasks;
      
      // Filter by employee if selected
      if (filter.employee) {
        relevantTasks = relevantTasks.filter(t => t.emp_name === filter.employee);
      }
      
      // Get projects from filtered tasks
      const uniqueProjects = Array.from(new Set(relevantTasks.map(t => t.project))).filter(Boolean);
      setProjects(uniqueProjects);

      // Filter by project if selected (further narrow down)
      if (filter.project) {
        relevantTasks = relevantTasks.filter(t => t.project === filter.project);
      }

      // Get statuses from the most filtered tasks
      const uniqueStatuses = Array.from(new Set(relevantTasks.map(t => t.status))).filter(Boolean);
      setStatuses(uniqueStatuses);
    }
  }, [props.showFilters, tasks, filter.employee, filter.project]); // ✅ Added filter.project as dependency

  // ✅ UPDATED: Auto-reset project and status filters if they become invalid
  useEffect(() => {
    if (filter.employee) {
      const employeeTasks = tasks.filter(t => t.emp_name === filter.employee);
      const availableProjects = Array.from(new Set(employeeTasks.map(t => t.project))).filter(Boolean);
      
      // Reset project if it's not available for selected employee
      if (filter.project && !availableProjects.includes(filter.project)) {
        setFilter(prev => ({ ...prev, project: "", status: "" }));
        return;
      }

      // Reset status if it's not available for selected employee + project
      if (filter.project && filter.status) {
        const projectTasks = employeeTasks.filter(t => t.project === filter.project);
        const availableStatuses = Array.from(new Set(projectTasks.map(t => t.status))).filter(Boolean);
        
        if (!availableStatuses.includes(filter.status)) {
          setFilter(prev => ({ ...prev, status: "" }));
        }
      }
    }
  }, [filter.employee, filter.project, tasks]);

  // Filter tasks based on employee, project, and search
  useEffect(() => {
    let result = [...tasks];

    if (filter.employee) {
      result = result.filter(t => t.emp_name === filter.employee);
    }

    if (filter.project) {
      result = result.filter(t => t.project === filter.project);
    }

    if (filter.search) {
      result = result.filter(
        t =>
          t.task_details?.toLowerCase().includes(filter.search.toLowerCase()) ||
          t.module?.toLowerCase().includes(filter.search.toLowerCase()) ||
          t.submodule?.toLowerCase().includes(filter.search.toLowerCase())
      );
    }

    if (filter.status) {
      result = result.filter(t => (t.status || "").toLowerCase() === filter.status.toLowerCase());
    }

    if (filter.fromDate || filter.toDate) {
      const from = filter.fromDate ? new Date(filter.fromDate) : null;
      const to = filter.toDate ? new Date(filter.toDate) : null;
      result = result.filter(t => {
        if (!t.created_at) return false;
        const created = new Date(t.created_at);
        // convert to IST date-only string for inclusive comparison
        const ist = new Date(created.getTime() + 5.5 * 60 * 60 * 1000);
        const ymd = ist.toISOString().slice(0,10);
        const current = new Date(ymd + "T00:00:00Z");
        if (from && current < new Date(new Date(filter.fromDate).toISOString().slice(0,10) + "T00:00:00Z")) return false;
        if (to && current > new Date(new Date(filter.toDate).toISOString().slice(0,10) + "T00:00:00Z")) return false;
        return true;
      });
    }

    setFilteredTasks(result);
  }, [filter, tasks]);

  // Convert UTC to IST and format as DD-MM-YYYY
  const formatToIST = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    const day = String(istDate.getDate()).padStart(2, '0');
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    const year = istDate.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const pendingTasks = tasks.filter(task => task.status === "Pending");
  const completedTasks = tasks.filter(task => task.status === "Completed");
  
  // Decide which tasks to show
  const displayedTasks = props.taskType === "pendingTasks"
    ? pendingTasks
    : props.taskType === "completedTasks"
      ? completedTasks
      : filteredTasks;

  // Notify parent about the current displayed list (for export)
  useEffect(() => {
    if (typeof props.onFilteredChange === "function") {
      props.onFilteredChange(displayedTasks);
    }
  }, [displayedTasks, props]);

  // Export function for tasks
  const exportTasksToExcel = () => {
    if (displayedTasks.length === 0) {
      alert("No tasks to export!");
      return;
    }
    
    const worksheetData = displayedTasks.map(task => ({
      "Task ID": task.task_id,
      "Employee Name": task.emp_name,
      "Employee Code": task.emp_code,
      "Project": task.project,
      "Module": task.module,
      "Submodule": task.submodule,
      "Task Details": task.task_details,
      "Assigned At": (() => {
        if (!task.created_at) return "";
        const date = new Date(task.created_at);
        const istDate = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
        return istDate.toLocaleString("en-IN", {
          day: "2-digit",
          month: "2-digit", 
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true
        });
      })(),
      "Assigned From": task.assigned_from,
      "Status": task.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    
    const taskType = props.taskType === "pendingTasks" ? "Pending_Tasks" : 
                    props.taskType === "completedTasks" ? "Completed_Tasks" : "All_Tasks";
    saveAs(data, `${taskType}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="task-assign-form-wrapper">
      <div className="task-list-container">
        {/* Header with Title and Download Button */}
        <div className="task-header">
          <h2 className="task-title">
            {props.taskType === "pendingTasks" ? "Pending Tasks" : 
             props.taskType === "completedTasks" ? "Completed Tasks" : "All Tasks"}
          </h2>
          <button className="download-excel-btn" onClick={exportTasksToExcel}>
            ⬇️ Download Excel
          </button>
        </div>

      {/* Filters */}
      {props.showFilters && (
        <div className="filters">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
            <select value={filter.employee} onChange={e => setFilter({ ...filter, employee: e.target.value })}>
              <option value="">Filter by Name</option>
              {employees.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <select value={filter.project} onChange={e => setFilter({ ...filter, project: e.target.value })}>
              <option value="">Filter by Project</option>
              {projects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
            <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
              <option value="">Filter by Status</option>
              {statuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <input type="date" value={filter.fromDate} onChange={e => setFilter({ ...filter, fromDate: e.target.value })} />
            <input type="date" value={filter.toDate} onChange={e => setFilter({ ...filter, toDate: e.target.value })} />
            <input type="text" placeholder="Search task/module/submodule" value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} />
            <button onClick={() => setFilter({ employee: "", project: "", status: "", fromDate: "", toDate: "", search: "" })}>Clear</button>
          </div>
        </div>
      )}

      {/* Tasks Table */}
      <table className="task-table">
        <thead>
          <tr>
            <th>S.No</th>
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
              <td colSpan="9" style={{ textAlign: "center" }}>
                No tasks found
              </td>
            </tr>
          ) : (
            displayedTasks.map((task, index) => (
              <tr key={task.task_id}>
                <td>{index + 1}</td>
                <td>
                  {task.emp_name} ({task.emp_code})
                </td>
                <td>{task.project}</td>
                <td>{task.module}</td>
                <td>
                  {task.submodule} - {task.task_details}
                </td>
                <td>{formatToIST(task.created_at)}</td>
                <td>{task.assigned_from}</td>
                <td>{task.status}</td>
                <td>
                  <button className="delete-btn" onClick={() => {
                    if (window.confirm('Are you sure you want to delete this task?')) {
                      // Add delete functionality here if needed
                      console.log('Delete task:', task.task_id);
                    }
                  }}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export default Task;
