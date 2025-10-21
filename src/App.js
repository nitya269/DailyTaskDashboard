import AdminDashboard from "./Pages/AdminDashboard";
import AdminLogin from "./Pages/AdminLogin";
import EmployeeDashboard from "./Pages/EmployeeDashboard";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import TaskAssignForm from "./Pages/TaskAssignForm";
import Task from "./Pages/Task";
import Report from "./Pages/Report";


function App() {
  return (
    <div className="app-wrapper">
      <Router>
        <Routes>
        {/* Admin login page */}
       <Route path="/" element={<AdminLogin />} />
       <Route path="/admin-dashboard" element={<AdminDashboard />} />
       <Route path="/report" element={<Report />} />
         <Route path="/employee-dashboard/:empCode" element={<EmployeeDashboard />} />       
          <Route path="/assign-task" element={<TaskAssignForm />} />
        </Routes>
      </Router>
    </div>
  );
} 


export default App;
