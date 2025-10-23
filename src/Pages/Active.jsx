import React, { useState, useEffect } from 'react';

const Active = ({ employees: employeesProp, tasks: tasksProp }) => {
  const [activeEmployees, setActiveEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const computeFromProps = () => {
      try {
        const employees = Array.isArray(employeesProp) ? employeesProp : [];
        const allTasks = Array.isArray(tasksProp) ? tasksProp : [];
        const employeesWithTasks = employees.map(employee => {
          const employeeTasks = allTasks.filter(task => task.emp_code === employee.emp_code);
          const allTasksCompleted = employeeTasks.length > 0 && employeeTasks.every(task => task.status === 'Completed');
          return { ...employee, tasks: employeeTasks, isActive: allTasksCompleted };
        });
        const activeEmployeesList = employeesWithTasks.filter(emp => emp.isActive);
        setActiveEmployees(activeEmployeesList);
        setLoading(false);
      } catch (err) {
        console.error('Error computing active employees:', err);
        setError('Failed to compute active employees.');
        setLoading(false);
      }
    };

    if (Array.isArray(employeesProp) && Array.isArray(tasksProp)) {
      // Use pre-fetched data for instant render
      setLoading(true);
      computeFromProps();
    } else {
      // Fallback to fetching if props not provided
      fetchActiveEmployees();
    }
  }, [employeesProp, tasksProp]);

  const fetchActiveEmployees = async () => {
    try {
      setLoading(true);

      const [empResponse, tasksResponse] = await Promise.all([
        fetch('http://localhost:5000/api/employees'),
        fetch('http://localhost:5000/api/tasks')
      ]);

      const employees = await empResponse.json();
      const allTasks = await tasksResponse.json();

      const employeesWithTasks = employees.map(employee => {
        const employeeTasks = allTasks.filter(task => task.emp_code === employee.emp_code);
        const allTasksCompleted = employeeTasks.length > 0 && employeeTasks.every(task => task.status === 'Completed');
        return { ...employee, tasks: employeeTasks, isActive: allTasksCompleted };
      });

      const activeEmployeesList = employeesWithTasks.filter(emp => emp.isActive);
      setActiveEmployees(activeEmployeesList);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch active employees. Please try again later.');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading active employees...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="task-assign-form-wrapper">
      <div className="task-list-container">
      <h2>Active Employees</h2>
      <p style={{ marginBottom: '15px', color: '#666' }}>Employees who have completed all their tasks</p>
      
      {activeEmployees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          <p>No active employees found</p>
          <p style={{ fontSize: '0.9em', marginTop: '5px' }}>Active employees are those who have completed all their assigned tasks.</p>
        </div>
      ) : (
        <table className="task-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Employee Code</th>
              <th>Employee Name</th>
              <th>Department</th>
              <th>Position</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Completed Tasks</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {activeEmployees.map((employee, index) => (
              <tr key={employee.emp_code}>
                <td>{index + 1}</td>
                <td>{employee.emp_code}</td>
                <td>{employee.name}</td>
                <td>{employee.department || 'N/A'}</td>
                <td>{employee.position || 'N/A'}</td>
                <td>{employee.email || 'N/A'}</td>
                <td>{employee.mobile || 'N/A'}</td>
                <td>{employee.tasks ? employee.tasks.length : 0}</td>
                <td>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    backgroundColor: '#e8f5e9',
                    color: '#2e7d32',
                    fontSize: '0.85em',
                    fontWeight: '500',
                    display: 'inline-block',
                    minWidth: '80px',
                    textAlign: 'center'
                  }}>
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
};

export default Active;
