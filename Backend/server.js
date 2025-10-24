import bodyParser from "body-parser";
import cors from "cors";
import crypto from "crypto";
import dotenv from "dotenv";
import express from "express";
import pg from "pg";
import { pool } from "./db.js";
import { config } from "./config.js";

dotenv.config(); // Load environment variables from .env

//const { Pool } = pg;

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// PostgreSQL connection
// const pool = new Pool({
//   connectionString:
//     "postgresql://neondb_owner:npg_4sGKRac7jDBY@ep-wandering-salad-adsv8ik7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
// });

// Utility: Hash password
const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required" });
    }

    const usernamePattern = /^DS\d{3}$/;
    const trimmedUsername = username.trim();  // remove leading/trailing spaces
    if (!usernamePattern.test(trimmedUsername)) {
      return res.status(400).json({ success: false, message: "Username must start with 'DS' followed by 3 digits" });
    }

    let userData = null;
    let role = null;

    // 1️⃣ Check if user exists in admin table
    const adminResult = await pool.query(
      "SELECT username, password, role, created_at FROM admin WHERE username = $1",
      [trimmedUsername]
    );

    if (adminResult.rows.length > 0) {
      // Admin login
      const adminUser = adminResult.rows[0];
      if (adminUser.password !== password) {
        return res.status(400).json({ success: false, message: "Invalid password" });
      }
      role = adminUser.role;

      // Fetch name/department from emp_details
      const empResult = await pool.query(
      "SELECT name, department, position FROM emp_details WHERE emp_code = $1",
      [username]
    );

      userData = {
        id: null,
        emp_code: adminUser.username,
        username: adminUser.username,
        role: adminUser.role,
        created_at: adminUser.created_at,
        name: empResult.rows.length > 0 ? empResult.rows[0].name : null,
        department: empResult.rows.length > 0 ? empResult.rows[0].department : null,
        position: empResult.rows.length > 0 ? empResult.rows[0].position : null,
      };

    } else {
      // Check employee table
      const empResult = await pool.query(
        "SELECT id, emp_code, name, department,position, password FROM emp_details WHERE emp_code = $1",
        [username]
      );

      if (empResult.rows.length === 0) {
        return res.status(400).json({ success: false, message: "User not found" });
      }

      const empUser = empResult.rows[0];
      if (empUser.password !== password) {
        return res.status(400).json({ success: false, message: "Invalid password" });
      }

      role = "employee";
      userData = {
        id: empUser.id, // employee table may not have id
        emp_code: empUser.emp_code,
        username: empUser.emp_code,
        role: role,
        name: empUser.name,
        department: empUser.department,
        position:empUser.position,
        created_at: null,
      };
    }

    return res.json({ success: true, role, user: userData });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ======================================
// Generate Employee Code
// ======================================
async function generateEmpCode() {
  const result = await pool.query("SELECT COUNT(*) FROM emp_details");
  const count = parseInt(result.rows[0].count, 10);
  const nextNumber = count + 1;
  return `DS${String(nextNumber).padStart(3, "0")}`;
}

// ======================================
// EMPLOYEE APIs
// ======================================

// Add new employee
app.post("/api/emp_details", async (req, res) => {
  try {
    console.log("📝 Received employee data:", req.body);
    console.log("📅 Raw date_of_joining from frontend:", req.body.date_of_joining);
    const { emp_code, name, email, department, position, mobile, date_of_joining } = req.body;
    
    // Validate required fields
    if (!emp_code || !name || !email || !department || !position) {
      console.log("❌ Missing required fields:", { emp_code, name, email, department, position });
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if employee code already exists
    console.log("🔍 Checking for existing employee code:", emp_code);
    const existingEmp = await pool.query("SELECT * FROM emp_details WHERE emp_code = $1", [emp_code]);
    if (existingEmp.rows.length > 0) {
      console.log("❌ Employee code already exists:", emp_code);
      return res.status(400).json({ error: "Employee code already exists" });
    }

    console.log("💾 Inserting employee into database...");
    
    // Handle mobile number - store as text to avoid integer overflow
    let mobileValue = null;
    if (mobile && mobile.trim()) {
      const mobileStr = String(mobile).trim();
      // Remove any non-numeric characters except + for international numbers
      const cleanMobile = mobileStr.replace(/[^\d+]/g, '');
      if (cleanMobile.length > 0) {
        mobileValue = cleanMobile;
        console.log("📱 Processed mobile number:", mobileValue);
      } else {
        console.log("⚠️ Invalid mobile number format, skipping:", mobileStr);
      }
    }
    
    // Handle date of joining - use provided date or null
    let dateValue = null;
    if (date_of_joining && date_of_joining.trim()) {
      // Ensure the date is in the correct format for PostgreSQL
      const dateStr = date_of_joining.trim();
      console.log("📅 Original date string:", dateStr);
      
      // If it's a valid date string, use it as-is
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Format the date to avoid timezone issues
        const [year, month, day] = dateStr.split('-');
        dateValue = `${year}-${month}-${day}`;
        console.log("📅 Valid date format, using:", dateValue);
      } else {
        console.log("⚠️ Invalid date format, skipping date");
      }
    }
    
    console.log("📅 Final date value being inserted:", dateValue);
    
    // Use different SQL based on whether we have a date or not
    let result;
    if (dateValue) {
      result = await pool.query(
        `INSERT INTO emp_details (emp_code, name, email, department, position, mobile, date_of_joining) 
         VALUES ($1, $2, $3, $4, $5, $6, $7::date) RETURNING *`,
        [emp_code, name, email, department, position, mobileValue, dateValue]
      );
    } else {
      result = await pool.query(
        `INSERT INTO emp_details (emp_code, name, email, department, position, mobile, date_of_joining) 
         VALUES ($1, $2, $3, $4, $5, $6, NULL) RETURNING *`,
        [emp_code, name, email, department, position, mobileValue]
      );
    }

    console.log("✅ Employee added successfully:", result.rows[0]);
    console.log("📅 Date returned from database:", result.rows[0].date_of_joining);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error adding employee:", err.message);
    console.error("❌ Full error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Get all employees
app.get("/api/emp_details", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM emp_details ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Delete employee
app.delete("/api/emp_details/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // First, get the employee's emp_code before deletion
    const empResult = await pool.query("SELECT emp_code FROM emp_details WHERE id = $1", [id]);
    
    if (empResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    
    const empCode = empResult.rows[0].emp_code;
    
    // Delete all tasks associated with this employee first
    await pool.query("DELETE FROM task_details WHERE emp_code = $1", [empCode]);
    
    // Then delete the employee
    await pool.query("DELETE FROM emp_details WHERE id = $1", [id]);
    
    res.json({ success: true, message: "Employee and associated tasks deleted successfully" });
  } catch (err) {
    console.error("Error deleting employee:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// Get specific employee
app.get("/api/employees/:emp_code", async (req, res) => {
  const { emp_code } = req.params;
  try {
    const result = await pool.query("SELECT * FROM emp_details WHERE emp_code=$1", [emp_code]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Employee not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all employees simplified
app.get("/api/employees", async (req, res) => {
  try {
    const result = await pool.query("SELECT emp_code, name FROM emp_details");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// ======================================
// TASK APIs
// ======================================

// Assign Task
app.post("/api/tasks", async (req, res) => {
  const { emp_code, project, module, submodule, task_details, assigned_from } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO task_details (emp_code, project, module, submodule, task_details, assigned_from, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending', NOW())
       RETURNING *`,
      [emp_code, project, module, submodule, task_details, assigned_from]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error inserting task:", err);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Get all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.task_id, t.emp_code, e.name AS emp_name, t.project, t.module, t.submodule, 
             t.task_details, t.created_at, t.assigned_from, t.status
      FROM task_details t
      JOIN emp_details e ON t.emp_code = e.emp_code
      ORDER BY t.task_id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching tasks:", err.message);
    res.status(500).send("Server error");
  }
});

// Get tasks for employee
app.get("/api/tasks/:emp_code", async (req, res) => {
  const empCode = req.params.emp_code;
  try {
    const result = await pool.query(`
      SELECT t.task_id, t.emp_code, e.name AS emp_name,
             t.project, t.module, t.submodule, t.task_details,
             t.created_at, t.assigned_from, t.status
      FROM task_details t
      JOIN emp_details e ON t.emp_code = e.emp_code
      WHERE t.emp_code = $1
      ORDER BY t.created_at DESC
    `, [empCode]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching tasks:", err.message);
    res.status(500).send("Server error");
  }
});

// Update task status
app.put("/api/tasks/:task_id", async (req, res) => {
  const taskId = req.params.task_id;
  const { status } = req.body;

  try {
    const result = await pool.query(`
      UPDATE task_details
      SET status = $1
      WHERE task_id = $2
      RETURNING *
    `, [status, taskId]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating task:", err.message);
    res.status(500).send("Server error");
  }
});

// Delete task
app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM task_details WHERE task_id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error("Error deleting task:", err.message);
    res.status(500).send("Server error");
  }
});

// ======================================
// PROJECT APIs
// ======================================
app.get("/api/projects", async (req, res) => {
  try {
    const result = await pool.query("SELECT project_id, project_name FROM projects");
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// ======================================
// DASHBOARD STATS
// ======================================
app.get("/api/dashboard-stats", async (req, res) => {
  try {
    const empResult = await pool.query("SELECT COUNT(*) FROM emp_details");
    const totalEmployees = parseInt(empResult.rows[0].count, 10);

    const taskResult = await pool.query("SELECT COUNT(*) FROM task_details");
    const totalTasks = parseInt(taskResult.rows[0].count, 10);

    const pendingResult = await pool.query("SELECT COUNT(*) FROM task_details WHERE status='Pending'");
    const pendingTasks = parseInt(pendingResult.rows[0].count, 10);

    res.json({
      total_employees: totalEmployees,
      total_tasks: totalTasks,
      pending_tasks: pendingTasks
    });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});



app.put("/api/tasks/:task_id/status", async (req, res) => {
  const { task_id } = req.params;
  const { status } = req.body;

  console.log("Received task_id:", task_id, "status:", status); // ✅ Debug line

  if (!status) {
    return res.status(400).json({ success: false, message: "Status is required" });
  }

  try {
    const result = await pool.query(
      "UPDATE task_details SET status = $1 WHERE task_id = $2 RETURNING *",
      [status, task_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    res.json({ success: true, message: "Status updated successfully", task: result.rows[0] });
  } catch (err) {
    console.error("Error updating task status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// Test route
app.get("/", (req, res) => {
  res.send("Task API is running...");
});

// Connect to DB and start server
pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("DB connection error", err));

app.listen(config.server.port, () => {
  console.log(`✅ Server running on port ${config.server.port}`);
});