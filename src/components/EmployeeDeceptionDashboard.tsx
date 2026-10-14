import React, { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Briefcase,
  CheckCircle2,
  LogOut,
  Send,
  UserCheck,
  FileText,
  FolderKanban,
  AlertTriangle,
  Wifi,
  ShieldCheck,
  Server
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * EmployeeDeceptionDashboard
 *
 * Deception-environment employee portal presented to attackers who have
 * triggered the EMPLOYEE_DECEPTION classification. Visually mirrors
 * RealDashboard.tsx but:
 *   - Fetches all data exclusively from /api/employee-deception/* endpoints
 *   - Never falls back to real employee APIs (/api/employee/*, /api/real/*)
 *   - Contains no genuine employee data; all content is server-assigned synthetic
 *   - Every interaction is reported back as a deception telemetry event
 */

interface EmployeeDeceptionDashboardProps {
  session: any;
  onLogout: () => void;
}

type Task   = { id: string; title: string; completed: boolean };
type Project = { code: string; name: string; schedule: string; status: string };
type Ticket  = { id: string; category: string; text: string; status: string; date: string };

/** POST a telemetry action to the dedicated deception endpoint. Fire-and-forget. */
async function recordAction(
  sessionId: string,
  token: string,
  action: string,
  details: string,
  threatPoints = 15
): Promise<void> {
  try {
    await fetch(`/api/employee-deception/action/${sessionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": sessionId,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ action, details, threatPoints })
    });
  } catch {
    // Silent — telemetry failures must not trigger any fallback to real APIs
  }
}

export default function EmployeeDeceptionDashboard({
  session,
  onLogout
}: EmployeeDeceptionDashboardProps) {
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // All state is seeded from synthetic server data only
  const [profile, setProfile]   = useState<any>(null);
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Helpdesk form
  const [ticketCategory, setTicketCategory] = useState("IT Infrastructure");
  const [ticketText, setTicketText]         = useState("");
  const [submittedTickets, setSubmittedTickets] = useState<Ticket[]>([]);
  const [showToast, setShowToast]           = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const token = () => localStorage.getItem("jwt_token") || "";

  const authHeaders = useCallback((): Record<string, string> => ({
    "Content-Type": "application/json",
    "x-session-id": session?.id || "",
    ...(token() ? { Authorization: `Bearer ${token()}` } : {})
  }), [session?.id]);

  // ── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadDecoyData() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/employee-deception/dashboard/${session.id}`,
          { headers: authHeaders() }
        );
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled && json.status === "success" && json.data) {
          setProfile(json.data.profile || null);
          setTasks(json.data.tasks || []);
          setProjects(json.data.projects || []);
        } else if (!cancelled) {
          setLoadError("Portal data unavailable. Please try again later.");
        }
      } catch (err: any) {
        if (!cancelled) {
          // Show a neutral error — never fall back to real APIs
          setLoadError("Unable to connect to the employee portal. Please contact IT support.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDecoyData();
    return () => { cancelled = true; };
  }, [session.id]);

  // ── Decoy task toggle (records telemetry, updates local state only) ────────
  const handleTaskToggle = async (taskId: string, currentCompleted: boolean) => {
    const next = !currentCompleted;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: next } : t));
    await recordAction(
      session.id, token(),
      "Task Interaction",
      `Attacker toggled task '${taskId}' to ${next ? "completed" : "pending"} in employee honeypot`,
      15
    );
  };

  // ── Decoy ticket submit ────────────────────────────────────────────────────
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketText.trim() || submittingTicket) return;
    const cat  = ticketCategory;
    const text = ticketText.trim();
    setTicketText("");
    setSubmittingTicket(true);

    try {
      const res = await fetch(`/api/employee-deception/ticket/${session.id}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ category: cat, text })
      });
      const json = await res.json();
      if (json.status === "success" && json.ticket) {
        setSubmittedTickets(prev => [json.ticket, ...prev]);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch {
      // Neutral failure — no fallback to real helpdesk
    } finally {
      setSubmittingTicket(false);
    }
  };

  // ── Project row click → records telemetry ─────────────────────────────────
  const handleProjectView = async (code: string, name: string) => {
    await recordAction(
      session.id, token(),
      "Project Record Viewed",
      `Attacker clicked on project '${code}: ${name}' in employee honeypot`,
      10
    );
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500 gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-xs text-slate-500">
          Connecting to SVIT Employee Portal...
        </span>
      </div>
    );
  }

  // ── Error state (safe — no real-API fallback) ──────────────────────────────
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-500">
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-5 py-3 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-mono text-amber-800">{loadError}</span>
        </div>
        <button
          onClick={onLogout}
          className="text-xs text-slate-400 underline cursor-pointer hover:text-slate-600"
        >
          Return to login
        </button>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div
      className="max-w-7xl mx-auto px-4 py-8 space-y-8 text-slate-700"
      id="employee-deception-dashboard"
    >
      {/* Success toast for ticket submit */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 z-50 text-xs font-bold font-mono"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            SUCCESS: IT SERVICE REQUEST TRANSMITTED SECURELY
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-mono font-bold tracking-widest text-emerald-700 uppercase">
                Authenticated Staff SSO Portal
              </p>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">
              Sai Vidya Institute of Technology Employee Portal
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Employee Account:{" "}
              <span className="font-mono underline text-slate-800 font-semibold">
                {session.username}
              </span>{" "}
              | Staff ID:{" "}
              <span className="font-mono text-emerald-700 font-bold">
                {profile?.staffId || "SVIT_EMP_2026_7741"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="text-right hidden lg:block border-r border-slate-200/80 pr-4">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">
              Session Token
            </p>
            <p className="text-xs font-mono text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-200/60">
              {session.id}
            </p>
          </div>
          <button
            onClick={onLogout}
            id="emp-dec-logout-btn"
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            Secure Logout
          </button>
        </div>
      </div>

      {/* ── Bento: Profile + Projects ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Employee Profile Card */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 md:col-span-4 flex flex-col justify-between gap-5 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-3.5">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider font-mono">
              Employee Overview
            </h2>
          </div>

          <div className="space-y-3.5 text-xs">
            {[
              { label: "Department",     value: profile?.department    || "Network Operations" },
              { label: "Position",       value: profile?.position      || "Level 2 Technician" },
              { label: "Payroll Status", value: profile?.payrollStatus || "Disbursed (Verified)", highlight: "text-emerald-700" },
              { label: "Paid Leave Balance", value: profile?.leaveBalance || "12 / 24 Days", highlight: "text-blue-600" }
            ].map(({ label, value, highlight }) => (
              <div
                key={label}
                className="flex justify-between items-center bg-slate-50/80 p-3 rounded-xl border border-slate-200/70"
              >
                <span className="text-slate-500 font-mono text-[10px] uppercase">{label}</span>
                <span className={`font-bold font-mono ${highlight ?? "text-slate-900"}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-50/80 border border-slate-200/70 p-3 rounded-xl space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-mono text-[10px]">
                Zero-Trust Staff Clearance:
              </span>
              <span className="font-semibold text-emerald-700 font-bold font-mono">
                {profile?.clearanceLevel || "LEVEL 2 APPROVED"}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${profile?.clearancePct ?? 50}%` }}
              />
            </div>
          </div>
        </div>

        {/* Projects Table */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 md:col-span-8 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-3.5">
            <FolderKanban className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider font-mono">
              Institutional Projects &amp; Tasks
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200/80">
              <thead>
                <tr className="text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                  <th className="font-medium pb-2">Code</th>
                  <th className="font-medium pb-2">Project Name</th>
                  <th className="font-medium pb-2">Schedule Timeline</th>
                  <th className="font-medium pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {projects.map((prj) => (
                  <tr
                    key={prj.code}
                    className="text-slate-700 hover:bg-blue-50/40 transition-colors cursor-pointer"
                    onClick={() => handleProjectView(prj.code, prj.name)}
                    title="View project details"
                  >
                    <td className="py-3 font-mono font-bold text-blue-700">{prj.code}</td>
                    <td className="py-3 font-semibold text-slate-800">{prj.name}</td>
                    <td className="py-3 text-slate-600">{prj.schedule}</td>
                    <td className="py-3 text-right">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {prj.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Synthetic system posture badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { icon: Server,     label: "Switch Fabric",  value: "Operational" },
              { icon: Wifi,       label: "VPN Tunnel",     value: "6 Active" },
              { icon: ShieldCheck, label: "Threat Level",  value: "Low / Normal" },
              { icon: Briefcase,  label: "Endpoints",      value: "18/18" }
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-2.5 flex flex-col gap-0.5"
              >
                <div className="flex items-center gap-1 text-[9px] text-slate-500 font-mono uppercase">
                  <Icon className="w-3 h-3 text-blue-500" />
                  {label}
                </div>
                <span className="text-xs font-bold text-slate-800 font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tasks + Helpdesk ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Decoy Task Checklist */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex justify-between items-center border-b border-slate-200/80 pb-3.5">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider font-mono">
                Employee Operations Checklist
              </h2>
            </div>
            <span className="text-[10px] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-mono text-blue-700 font-semibold">
              {tasks.filter(t => t.completed).length} / {tasks.length} Completed
            </span>
          </div>

          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {tasks.map(task => (
              <div
                key={task.id}
                className="flex items-start justify-between p-2.5 bg-slate-50/60 rounded-xl border border-slate-200/70 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`dec-task-${task.id}`}
                    checked={task.completed}
                    onChange={() => handleTaskToggle(task.id, task.completed)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4 cursor-pointer bg-white"
                  />
                  <label
                    htmlFor={`dec-task-${task.id}`}
                    className={`text-xs cursor-pointer ${
                      task.completed
                        ? "line-through text-slate-400"
                        : "text-slate-700 font-medium"
                    }`}
                  >
                    {task.title}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decoy IT Helpdesk */}
        <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-3.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wider font-mono">
              Employee IT Helpdesk Gate
            </h2>
          </div>

          <form onSubmit={handleTicketSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-500 font-mono text-[9px] uppercase font-semibold">
                  Request Type
                </label>
                <select
                  value={ticketCategory}
                  onChange={e => setTicketCategory(e.target.value)}
                  className="w-full bg-slate-50/70 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="IT Infrastructure">IT Infrastructure</option>
                  <option value="Network Access">Network Access</option>
                  <option value="Hardware Allocation">Hardware Allocation</option>
                  <option value="VPN & Remote Access">VPN &amp; Remote Access</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-500 font-mono text-[9px] uppercase font-semibold">
                  Tunnel Security
                </label>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-emerald-700 font-mono font-bold">
                  ● LINK ENCRYPTED
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-slate-500 font-mono text-[9px] uppercase font-semibold">
                Request / Ticket Description
              </label>
              <textarea
                value={ticketText}
                onChange={e => setTicketText(e.target.value)}
                placeholder="Submit ticket inquiries directly to the IT operations desk..."
                rows={3}
                className="w-full bg-slate-50/70 border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submittingTicket}
              id="emp-dec-ticket-submit"
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-extrabold rounded-xl hover:from-blue-700 hover:via-indigo-700 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              {submittingTicket ? "Submitting..." : "Submit IT Ticket"}
            </button>
          </form>

          {submittedTickets.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Active Tickets
              </p>
              <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                {submittedTickets.map(item => (
                  <div
                    key={item.id}
                    className="p-2 bg-slate-50/70 rounded-lg border border-slate-200/80 flex justify-between items-start text-[11px] shadow-2xs"
                  >
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
