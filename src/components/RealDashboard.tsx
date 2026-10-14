import React, { useEffect, useState } from "react";
import { 
  Building2, 
  Briefcase, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Network, 
  Send, 
  UserCheck, 
  Database,
  Search,
  Plus,
  Trash2,
  FileText,
  DollarSign,
  ShieldCheck,
  FolderKanban
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RealDashboardProps {
  session: any;
  onLogout: () => void;
}

export default function RealDashboard({ session, onLogout }: RealDashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Employee tasks checklist
  const [tasks, setTasks] = useState([
    { id: 101, title: "Check and submit the quarterly IT compliance report", completed: true },
    { id: 102, title: "Schedule server maintenance for Rack 4 - confirm with team", completed: false },
    { id: 103, title: "Fill out annual self-appraisal form before Friday", completed: false },
    { id: 104, title: "Complete the mandatory network security training module", completed: true }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  
  // Internal projects list
  const [projects, setProjects] = useState([
    { code: "PRJ-901", name: "Campus Network Infrastructure Upgrade", schedule: "Due: Aug 15", status: "Active" },
    { code: "PRJ-882", name: "Employee Directory & Single Sign-On Revamp", schedule: "Due: Sep 01", status: "Active" },
    { code: "PRJ-750", name: "College Data Backup & Disaster Recovery", schedule: "Due: Oct 10", status: "In Review" }
  ]);
  const [showAddProject, setShowAddProject] = useState(false);
  const [addProjectCode, setAddProjectCode] = useState("");
  const [addProjectName, setAddProjectName] = useState("");
  const [addProjectSchedule, setAddProjectSchedule] = useState("");

  // Employee IT support & feedback
  const [feedbackCategory, setFeedbackCategory] = useState("IT Infrastructure");
  const [feedbackText, setFeedbackText] = useState("");
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<{ id: string; category: string; text: string; date: string }[]>([]);
  const [showFeedbackToast, setShowFeedbackToast] = useState(false);

  // Helper to attach session and JWT headers
  const getEmployeeHeaders = () => {
    const token = localStorage.getItem("jwt_token") || "";
    return {
      "Content-Type": "application/json",
      "x-session-id": session?.id || "",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
  };

  useEffect(() => {
    async function fetchRealData() {
      try {
        const res = await fetch(`/api/real/dashboard/${session.id}`, {
          headers: getEmployeeHeaders()
        });
        const json = await res.json();
        if (json.status === "success" && json.data) {
          setData(json.data);
          if (json.data.tasks) setTasks(json.data.tasks);
          if (json.data.projects) setProjects(json.data.projects);
          if (json.data.tickets) setSubmittedFeedbacks(json.data.tickets);
        }
      } catch (err) {
        console.error("Failed to load real dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRealData();
  }, [session.id]);

  const handleToggleTask = async (taskId: any, currentCompleted: boolean) => {
    const nextState = !currentCompleted;
    setTasks(prev => 
      prev.map(t => t.id === taskId ? { ...t, completed: nextState } : t)
    );

    try {
      await fetch(`/api/employee/tasks/${taskId}`, {
        method: "PATCH",
        headers: getEmployeeHeaders(),
        body: JSON.stringify({ sessionId: session.id, completed: nextState })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle.trim();
    setNewTaskTitle("");

    try {
      const res = await fetch("/api/employee/tasks", {
        method: "POST",
        headers: getEmployeeHeaders(),
        body: JSON.stringify({ sessionId: session.id, title })
      });
      const json = await res.json();
      if (json.status === "success" && json.task) {
        setTasks(prev => [json.task, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (id: any) => {
    setTasks(prev => prev.filter(t => t.id !== id));

    try {
      await fetch(`/api/employee/tasks/${id}`, {
        method: "DELETE",
        headers: getEmployeeHeaders(),
        body: JSON.stringify({ sessionId: session.id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Delete project handler – UI updates only after successful server response
  const handleDeleteProject = async (code: string) => {
    if (!window.confirm(`Delete project ${code}?`)) return;
    try {
      const res = await fetch(`/api/employee/projects/${code}`, {
        method: "DELETE",
        headers: getEmployeeHeaders(),
        body: JSON.stringify({ sessionId: session.id })
      });
      const json = await res.json();
      if (json.status === "success") {
        setProjects(prev => prev.filter(p => p.code !== code));
      } else {
        alert(json.message || "Failed to delete project");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete project");
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addProjectCode || !addProjectName) return;
    const code = addProjectCode.toUpperCase();
    const name = addProjectName;
    const schedule = addProjectSchedule || "TBD";

    setAddProjectCode("");
    setAddProjectName("");
    setAddProjectSchedule("");
    setShowAddProject(false);

    try {
      const res = await fetch("/api/employee/projects", {
        method: "POST",
        headers: getEmployeeHeaders(),
        body: JSON.stringify({ sessionId: session.id, code, name, schedule })
      });
      const json = await res.json();
      if (json.status === "success" && json.project) {
        setProjects(prev => [...prev, json.project]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    const category = feedbackCategory;
    const text = feedbackText.trim();
    setFeedbackText("");

    try {
      const res = await fetch("/api/employee/tickets", {
        method: "POST",
        headers: getEmployeeHeaders(),
        body: JSON.stringify({ sessionId: session.id, category, text })
      });
      const json = await res.json();
      if (json.status === "success" && json.ticket) {
        setSubmittedFeedbacks(prev => [json.ticket, ...prev]);
        setShowFeedbackToast(true);
        setTimeout(() => setShowFeedbackToast(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="font-mono text-xs text-slate-500">Connecting to SVIT Employee Portal...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 text-slate-700" id="real-dashboard-view">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {showFeedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 z-50 text-xs font-bold font-mono"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Ticket submitted!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] font-mono font-bold tracking-widest text-emerald-700 uppercase">Staff Portal — Authenticated</p>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">SVIT Employee Dashboard</h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Logged in as: <span className="font-mono underline text-slate-800 font-semibold">{session.username}</span> | Staff ID: <span className="font-mono text-emerald-700 font-bold">SVIT-EMP-9201</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="text-right hidden lg:block border-r border-slate-200/80 pr-4">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">Session Token</p>
            <p className="text-xs font-mono text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-200/60">{session.id}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Secure Logout
          </button>
        </div>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Employee Profile Metrics Bento Card */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 md:col-span-4 flex flex-col justify-between gap-5 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-3.5">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider font-mono">Your Profile</h2>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between items-center bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
              <span className="text-slate-500 font-mono text-[10px] uppercase">Department</span>
              <span className="font-bold text-slate-900 font-mono">IT Systems & Operations</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
              <span className="text-slate-500 font-mono text-[10px] uppercase">Position</span>
              <span className="font-bold text-slate-900 font-mono">Senior Administrator</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
              <span className="text-slate-500 font-mono text-[10px] uppercase">Payroll Status</span>
              <span className="font-bold text-emerald-700 font-mono">Disbursed (Verified)</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
              <span className="text-slate-500 font-mono text-[10px] uppercase">Paid Leave Balance</span>
              <span className="font-bold text-blue-600 font-mono">18 / 24 Days</span>
            </div>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-mono text-[10px]">Zero-Trust Staff Clearance:</span>
              <span className="font-semibold text-emerald-700 font-bold font-mono">ACCESS APPROVED</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }}></div>
            </div>
          </div>
        </div>

        {/* Assigned Staff Projects & Operations */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 md:col-span-8 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex justify-between items-center border-b border-slate-200/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <FolderKanban className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider font-mono">My Projects</h2>
            </div>

            <button
              onClick={() => setShowAddProject(!showAddProject)}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[10px] font-bold rounded-lg border border-blue-200 text-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Project
            </button>
          </div>

          {showAddProject && (
            <motion.form 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAddProject}
              className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs shadow-sm"
            >
              <div className="space-y-1">
                <label className="text-slate-500 font-mono text-[10px]">PROJECT ID</label>
                <input
                  type="text"
                  required
                  value={addProjectCode}
                  onChange={(e) => setAddProjectCode(e.target.value)}
                  placeholder="PRJ-950"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 font-mono text-[10px]">PROJECT TITLE</label>
                <input
                  type="text"
                  required
                  value={addProjectName}
                  onChange={(e) => setAddProjectName(e.target.value)}
                  placeholder="Library Wi-Fi Expansion"
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  Save Project
                </button>
              </div>
            </motion.form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200/80">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                  <th className="font-medium pb-2">Code</th>
                  <th className="font-medium pb-2">Project Name</th>
                  <th className="font-medium pb-2">Timeline</th>
                  <th className="font-medium pb-2 text-right">Status</th>
                  <th className="font-medium pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {projects.map((prj, idx) => (
                  <tr key={idx} className="text-slate-700 hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 font-mono font-bold text-blue-700">{prj.code}</td>
                    <td className="py-3 font-semibold text-slate-800">{prj.name}</td>
                    <td className="py-3 text-slate-600">{prj.schedule}</td>
                    <td className="py-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {prj.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button onClick={() => handleDeleteProject(prj.code)} className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Grid: Checklists vs Support Desk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Interactive Employee Checklist */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex justify-between items-center border-b border-slate-200/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider font-mono">My Tasks</h2>
            </div>
            <span className="text-[10px] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-mono text-blue-700 font-semibold">
              {tasks.filter(t => t.completed).length} / {tasks.length} Completed
            </span>
          </div>

          <form onSubmit={handleAddTask} className="flex gap-2 text-xs">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 bg-slate-50/70 border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 text-slate-800 placeholder-slate-400"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-sm"
            >
              Add
            </button>
          </form>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className="flex items-center justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-200/70 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id, task.completed)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer bg-white"
                  />
                  <span className={`text-xs ${task.completed ? "line-through text-slate-400" : "text-slate-700 font-medium"}`}>
                    {task.title}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* IT Support & Help Desk Gate */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-3.5">
            <FileText className="w-4.5 h-4.5 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider font-mono">IT Support Tickets</h2>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 font-mono text-[9px] uppercase font-semibold">Request Type</label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="IT Infrastructure">IT Infrastructure</option>
                  <option value="Payroll & HR">Payroll & HR</option>
                  <option value="Hardware Allocation">Hardware Allocation</option>
                  <option value="VPN & Network">VPN & Network Access</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 font-mono text-[9px] uppercase font-semibold">Tunnel Security</label>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-emerald-700 font-mono font-bold">
                  ✔ Connection Secure
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-mono text-[9px] uppercase font-semibold">Request / Ticket Description</label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Describe your issue or request here..."
                rows={3}
                className="w-full bg-slate-50/70 border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-extrabold rounded-xl hover:from-blue-700 hover:via-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" /> Submit IT Ticket
            </button>
          </form>

          {/* List of submitted tickets */}
          {submittedFeedbacks.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Active Tickets</p>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                {submittedFeedbacks.map((item) => (
                  <div key={item.id} className="p-2 bg-slate-50/70 rounded-lg border border-slate-200/80 flex justify-between items-start text-[11px] shadow-2xs">
                    <div className="truncate pr-2">
                      <span className="font-bold text-blue-700 font-mono">[{item.category}]</span>{" "}
                      <span className="text-slate-700">{item.text}</span>
                    </div>
                    <span className="text-[9px] text-slate-500 shrink-0 font-mono">{item.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
