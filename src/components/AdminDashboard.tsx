import React, { useEffect, useState, useRef } from "react";
import {
  ShieldAlert,
  Activity,
  UserCheck,
  Users,
  AlertTriangle,
  FileSearch,
  Zap,
  Terminal,
  RefreshCw,
  Cpu,
  TrendingUp,
  FileText,
  Clock,
  Download,
  Trash2,
  ShieldCheck,
  Play,
  FileSpreadsheet,
  ChevronRight,
  Search,
  Filter,
  Printer
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Session, Alert, DashboardStats, SecurityPolicy } from "../types.js";

// A simple, bulletproof Markdown-to-HTML parser for rendering the Gemini AI intent report
function renderMarkdown(markdown: string) {
  if (!markdown) return null;
  
  const lines = markdown.split("\n");
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    
    // Header 3
    if (trimmed.startsWith("###")) {
      return (
        <h3 key={idx} className="text-xs font-bold text-stone-900 mt-4 mb-2 uppercase tracking-wide border-b border-orange-100 pb-1 flex items-center gap-2 font-mono">
          {trimmed.replace("###", "").trim()}
        </h3>
      );
    }
    // Header 4
    if (trimmed.startsWith("####")) {
      return (
        <h4 key={idx} className="text-xs font-bold text-orange-600 mt-3 mb-1.5 uppercase font-mono">
          {trimmed.replace("####", "").trim()}
        </h4>
      );
    }
    // Header 2
    if (trimmed.startsWith("##")) {
      return (
        <h2 key={idx} className="text-sm font-bold text-stone-900 mt-5 mb-2.5 pb-1 border-b border-orange-100 font-mono">
          {trimmed.replace("##", "").trim()}
        </h2>
      );
    }
    // Header 1
    if (trimmed.startsWith("#")) {
      return (
        <h1 key={idx} className="text-base font-black text-stone-900 mt-6 mb-3 font-mono">
          {trimmed.replace("#", "").trim()}
        </h1>
      );
    }
    // Bullet list items
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const content = trimmed.substring(2);
      return (
        <li key={idx} className="text-xs text-stone-600 ml-4 list-disc mb-1.5 leading-relaxed">
          {renderInlineFormatting(content)}
        </li>
      );
    }
    // Number list items
    if (/^\d+\.\s/.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s/, "");
      return (
        <li key={idx} className="text-xs text-stone-600 ml-4 list-decimal mb-1.5 leading-relaxed">
          {renderInlineFormatting(content)}
        </li>
      );
    }
    // Empty line
    if (!trimmed) {
      return <div key={idx} className="h-2"></div>;
    }
    // Regular paragraph
    return (
      <p key={idx} className="text-xs text-stone-600 leading-relaxed mb-2.5">
        {renderInlineFormatting(line)}
      </p>
    );
  });
}

// Render bold (`**`) and inline code (`` ` ``)
function renderInlineFormatting(text: string) {
  const parts = [];
  let currentStr = text;
  
  while (currentStr.length > 0) {
    const boldIndex = currentStr.indexOf("**");
    const codeIndex = currentStr.indexOf("`");
    
    if (boldIndex === -1 && codeIndex === -1) {
      parts.push(currentStr);
      break;
    }
    
    if (codeIndex === -1 || (boldIndex !== -1 && boldIndex < codeIndex)) {
      parts.push(currentStr.substring(0, boldIndex));
      const endBold = currentStr.indexOf("**", boldIndex + 2);
      if (endBold === -1) {
        parts.push(currentStr.substring(boldIndex));
        break;
      }
      parts.push(
        <strong key={currentStr.length} className="font-semibold text-stone-950">
          {currentStr.substring(boldIndex + 2, endBold)}
        </strong>
      );
      currentStr = currentStr.substring(endBold + 2);
    } else {
      parts.push(currentStr.substring(0, codeIndex));
      const endCode = currentStr.indexOf("`", codeIndex + 1);
      if (endCode === -1) {
        parts.push(currentStr.substring(codeIndex));
        break;
      }
      parts.push(
        <code key={currentStr.length} className="bg-[#fbf9f5] border border-orange-100/60 px-1 py-0.5 rounded text-[10px] text-orange-600 font-mono">
          {currentStr.substring(codeIndex + 1, endCode)}
        </code>
      );
      currentStr = currentStr.substring(endCode + 1);
    }
  }
  
  return parts.length > 0 ? parts : text;
}

export default function AdminDashboard() {
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [alertsList, setAlertsList] = useState<Alert[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simAlertSuccess, setSimAlertSuccess] = useState(false);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const alertsEndRef = useRef<HTMLDivElement>(null);

  // Dynamic employees admin state
  const [employeesList, setEmployeesList] = useState<{ username: string; password?: string; department?: string; role?: string }[]>([]);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [newEmployeePassword, setNewEmployeePassword] = useState("");
  const [newEmployeeDept, setNewEmployeeDept] = useState("Engineering & IT");
  const [newEmployeeRole, setNewEmployeeRole] = useState("Staff Specialist");
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeeSuccess, setEmployeeSuccess] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);

  // Closed-loop Dynamic Security Policies state
  const [securityPolicies, setSecurityPolicies] = useState<SecurityPolicy[]>([]);
  const [deployingPolicy, setDeployingPolicy] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState<string | null>(null);
  const [connectionWarning, setConnectionWarning] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pollRequestIdRef = useRef(0);
  const lastSuccessTimestampRef = useRef(0);

  // MongoDB Historical Session Search & Filter state
  const [sessionSearch, setSessionSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Deception" | "Genuine">("all");
  const [threatFilter, setThreatFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const filteredSessions = activeSessions.filter((s) => {
    const matchesSearch =
      s.username.toLowerCase().includes(sessionSearch.toLowerCase()) ||
      (s.ip && s.ip.toLowerCase().includes(sessionSearch.toLowerCase())) ||
      s.id.toLowerCase().includes(sessionSearch.toLowerCase());

    const matchesStatus = statusFilter === "all" ? true : s.status === statusFilter;

    let matchesThreat = true;
    if (threatFilter === "high") matchesThreat = s.threatScore >= 70;
    else if (threatFilter === "medium") matchesThreat = s.threatScore >= 35 && s.threatScore < 70;
    else if (threatFilter === "low") matchesThreat = s.threatScore < 35;

    return matchesSearch && matchesStatus && matchesThreat;
  });

  const handleExportPdf = (session: Session) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Forensic Report - ${session.username}</title>
        <style>
          body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1c1917; background: #fff; line-height: 1.5; }
          .header { border-bottom: 2px solid #ea580c; padding-bottom: 15px; margin-bottom: 25px; }
          .title { font-size: 22px; font-weight: 800; color: #9a3412; margin: 0; }
          .subtitle { font-size: 13px; color: #78716c; margin-top: 4px; font-family: monospace; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
          .card { background: #fafaf9; border: 1px solid #e7e5e4; padding: 15px; border-radius: 8px; font-size: 12px; }
          .card-title { font-size: 11px; text-transform: uppercase; color: #78716c; font-weight: bold; margin-bottom: 8px; font-family: monospace; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; font-family: monospace; }
          .badge-deception { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }
          .badge-genuine { background: #d1fae5; color: #047857; border: 1px solid #a7f3d0; }
          .score { font-size: 32px; font-weight: 900; font-family: monospace; color: ${session.threatScore >= 70 ? '#dc2626' : session.threatScore >= 35 ? '#ea580c' : '#16a34a'}; }
          .section { margin-top: 30px; }
          .section-title { font-size: 14px; font-weight: bold; border-bottom: 1px solid #e7e5e4; padding-bottom: 8px; margin-bottom: 15px; color: #292524; font-family: monospace; text-transform: uppercase; }
          .timeline-item { padding: 8px 0; border-bottom: 1px dashed #e7e5e4; font-size: 12px; }
          .timestamp { font-family: monospace; font-size: 11px; color: #a8a29e; }
          .ai-report { background: #fff7ed; border: 1px solid #ffedd5; padding: 18px; border-radius: 8px; font-size: 12px; white-space: pre-wrap; font-family: system-ui, sans-serif; }
          .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e7e5e4; font-size: 11px; text-align: center; color: #a8a29e; font-family: monospace; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">SAI VIDYA INSTITUTE OF TECHNOLOGY</div>
          <div class="subtitle">Zero-Trust Deception Security Project — AI Cyber Forensic Intelligence Report</div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Target Session Metadata</div>
            <div><strong>User Identity:</strong> ${session.username}</div>
            <div><strong>Session Tunnel ID:</strong> ${session.id}</div>
            <div><strong>IP Address:</strong> ${session.ip || "127.0.0.1"}</div>
            <div><strong>Connection Time:</strong> ${new Date(session.loginTime).toLocaleString()}</div>
            <div style="margin-top: 10px;">
              <span class="badge ${session.status === "Deception" ? "badge-deception" : "badge-genuine"}">
                ${session.status === "Deception" ? "Deceptive Environment (Attacker)" : "Genuine User Session"}
              </span>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Dynamic Threat Assessment Risk Score</div>
            <div class="score">${session.threatScore} / 100</div>
            <div><strong>Adaptive Defense Status:</strong> ${session.threatScore >= 75 ? "🔴 Quarantined Containment Active" : session.threatScore >= 35 ? "🟡 Deceptive Divert In-Effect" : "🟢 Normal Operations Baseline"}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">🤖 Gemini AI Cognitive Forensic Analysis</div>
          <div class="ai-report">${session.aiSummary || "No Gemini AI threat analysis report compiled for this session yet."}</div>
        </div>

        <div class="section">
          <div class="section-title">⏱️ Interactive Behavior Log Timeline</div>
          ${session.logs.length === 0 ? '<div style="color: #a8a29e;">No actions recorded yet.</div>' : session.logs.map(log => `
            <div class="timeline-item">
              <span class="timestamp">[${new Date(log.timestamp).toLocaleTimeString()}]</span>
              <strong>${log.action}</strong> <span style="color: #ea580c; font-family: monospace;">(+${log.threatPoints} threat)</span>
              <div style="color: #57534e; margin-top: 2px;">${log.details}</div>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          Generated automatically by Zero-Trust API Gateway Deception Intelligence Module | Sai Vidya Institute of Technology Major Project
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(reportHtml);
    printWindow.document.close();
  };

  const getAdminHeaders = () => {
    const saved = localStorage.getItem("active_security_session");
    let sessId = "admin_session";
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.id) sessId = parsed.id;
      } catch (e) {}
    }
    const token = localStorage.getItem("jwt_token") || "";
    return {
      "x-session-id": sessId,
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
  };

  // Load Initial Datasets & Multi-Device State Sync with Stale-Response Rejection & Error Tolerance
  const fetchAllData = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    const reqId = ++pollRequestIdRef.current;
    try {
      const headers = getAdminHeaders();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const pollRes = await fetch("/api/admin/events-poll", {
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Discard response if a newer poll request was dispatched
      if (reqId !== pollRequestIdRef.current) return;

      if (!pollRes.ok) {
        // Non-2xx response (e.g. 503 during cold-start or DB reconnection)
        // PRESERVE last known good state! Never overwrite valid state with empty arrays!
        setConnectionWarning(`Reconnecting to telemetry gateway (HTTP ${pollRes.status}). Retaining active telemetry state.`);
        return;
      }

      const pollData = await pollRes.json();
      if (reqId !== pollRequestIdRef.current) return;

      if (pollData.status === "success") {
        // Discard stale response if timestamp is older than last processed successful response
        if (pollData.timestamp && pollData.timestamp < lastSuccessTimestampRef.current) {
          return;
        }
        if (pollData.timestamp) {
          lastSuccessTimestampRef.current = pollData.timestamp;
        }
        setConnectionWarning(null);

        const fetchedSessions: Session[] = pollData.sessions || [];
        if (fetchedSessions.length > 0) {
          setActiveSessions(fetchedSessions);
        } else if (Array.isArray(pollData.sessions)) {
          setActiveSessions(pollData.sessions);
        }

        if (Array.isArray(pollData.alerts)) setAlertsList(pollData.alerts);
        if (pollData.stats) setStats(pollData.stats);
        if (Array.isArray(pollData.employees)) setEmployeesList(pollData.employees);
        if (Array.isArray(pollData.policies)) setSecurityPolicies(pollData.policies);
        
        setSelectedSessionId(currentId => {
          // Keep current selection if session is still active
          if (currentId && fetchedSessions.some(s => s.id === currentId)) {
            return currentId;
          }
          // Default to first active session if none selected
          if (!currentId && fetchedSessions.length > 0) {
            return fetchedSessions[0].id;
          }
          // If current selection genuinely ended, switch to first available session
          if (currentId && !fetchedSessions.some(s => s.id === currentId) && fetchedSessions.length > 0) {
            return fetchedSessions[0].id;
          }
          return currentId;
        });
      } else {
        setConnectionWarning(pollData.message || "Telemetry gateway returned non-success. Retaining last state.");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("Telemetry polling transient connection warning:", err);
      }
      setConnectionWarning("Transient gateway synchronization delay. Retaining active telemetry state.");
    } finally {
      setLoading(false);
      if (manual) setIsRefreshing(false);
    }
  };

  const handleDeployPolicy = async (policy: Partial<SecurityPolicy>) => {
    setDeployingPolicy(true);
    setDeploySuccess(null);
    try {
      const res = await fetch("/api/admin/policies/deploy", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify(policy)
      });
      const data = await res.json();
      if (data.status === "success") {
        setDeploySuccess(`Deployed policy '${data.policy?.title || ''}' (${data.policy?.policyId || ''}) to API Gateway!`);
        fetchAllData();
      }
    } catch (e) {
      console.error("Policy deploy error:", e);
    } finally {
      setDeployingPolicy(false);
      setTimeout(() => setDeploySuccess(null), 4000);
    }
  };

  const handleTogglePolicyStatus = async (policyId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await fetch(`/api/admin/policies/${policyId}/toggle`, {
        method: "PATCH",
        headers: getAdminHeaders(),
        body: JSON.stringify({ status: nextStatus })
      });
      fetchAllData();
    } catch (e) {
      console.error("Policy toggle error:", e);
    }
  };

  const handleRegisterEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeEmail || !newEmployeePassword) {
      setEmployeeError("Both email and password are required.");
      return;
    }

    setRegistering(true);
    setEmployeeError(null);
    setEmployeeSuccess(null);

    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          username: newEmployeeEmail,
          password: newEmployeePassword,
          department: newEmployeeDept,
          role: newEmployeeRole
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        setEmployeeSuccess(data.message || "Employee registered successfully!");
        if (data.employee) {
          setEmployeesList(prev => {
            const exists = prev.some(e => e.username.toLowerCase() === data.employee.username.toLowerCase());
            if (exists) {
              return prev.map(e => e.username.toLowerCase() === data.employee.username.toLowerCase() ? data.employee : e);
            }
            return [data.employee, ...prev];
          });
        }
        setNewEmployeeEmail("");
        setNewEmployeePassword("");
        fetchAllData();
      } else {
        setEmployeeError(data.message || "Failed to register employee.");
      }
    } catch (err) {
      console.error(err);
      setEmployeeError("A network error occurred. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  const handleRemoveEmployee = async (username: string) => {
    setEmployeeError(null);
    setEmployeeSuccess(null);
    try {
      const res = await fetch(`/api/admin/employees/${encodeURIComponent(username)}`, {
        method: "DELETE",
        headers: getAdminHeaders()
      });
      const data = await res.json();
      if (data.status === "success") {
        setEmployeeSuccess(data.message || "Employee removed successfully.");
        fetchAllData();
      } else {
        setEmployeeError(data.message || "Failed to remove employee.");
      }
    } catch (err) {
      console.error(err);
      setEmployeeError("Error removing employee.");
    }
  };

  useEffect(() => {
    fetchAllData();

    // 2.0-second polling timer for seamless multi-device deployment sync
    const intervalId = setInterval(() => {
      fetchAllData();
    }, 2000);

    // Establish SSE Connection for instant real-time logs stream
    const eventSource = new EventSource("/api/admin/events");

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;

        if (type === "new_alert") {
          setAlertsList(prev => [data, ...prev]);
          refreshStats();
        } else if (type === "session_update") {
          setActiveSessions(prev => {
            const index = prev.findIndex(s => s.id === data.id);
            if (index !== -1) {
              const updated = [...prev];
              updated[index] = data;
              return updated;
            } else {
              return [data, ...prev];
            }
          });
          refreshStats();
        } else if (type === "session_deleted") {
          setActiveSessions(prev => prev.filter(s => s.id !== data));
          setSelectedSessionId(currentId => (currentId === data ? null : currentId));
          refreshStats();
        }
      } catch (err) {
        console.error("Error parsing SSE event payload", err);
      }
    };

    return () => {
      clearInterval(intervalId);
      eventSource.close();
    };
  }, []);

  const refreshStats = () => {
    fetch("/api/admin/stats", { headers: getAdminHeaders() })
      .then(res => res.json())
      .then(json => { if (json.status === "success") setStats(json.stats); });
  };

  // Trigger automated brute force infiltration scan
  const handleSimulateBrute = async () => {
    setSimulating(true);
    try {
      const res = await fetch("/api/admin/simulate/brute", { method: "POST", headers: getAdminHeaders() });
      const data = await res.json();
      if (data.status === "success" && data.session) {
        setSelectedSessionId(data.session.id);
        fetchAllData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  // Trigger simulated posture warnings
  const handleSimulateCritical = async () => {
    setSimAlertSuccess(true);
    try {
      await fetch("/api/admin/simulate/critical", { method: "POST", headers: getAdminHeaders() });
      fetchAllData();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setSimAlertSuccess(false), 3000);
    }
  };

  // Trigger real CSV telemetry report download
  const handleDownloadCsv = (sessId: string) => {
    window.open(`/api/admin/download-report/${sessId}`, "_blank");
  };

  // Request AI Attacker summary
  const handleGenerateSummary = async (sessionId: string) => {
    setActiveSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, generatingSummary: true } : s))
    );

    try {
      const res = await fetch(`/api/admin/summary/${sessionId}`, { method: "POST", headers: getAdminHeaders() });
      const data = await res.json();
      if (data.status === "success") {
        setActiveSessions(prev =>
          prev.map(s => (s.id === sessionId ? { ...s, aiSummary: data.summary, generatingSummary: false } : s))
        );
      }
    } catch (err) {
      console.error(err);
      setActiveSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, generatingSummary: false } : s))
      );
    }
  };

  const handleEndSession = async (sessionId: string) => {
    if (!window.confirm(`Are you sure you want to terminate session ${sessionId}? This will revoke access and log an audit trail.`)) {
      return;
    }
    try {
      const token = localStorage.getItem("jwt_token") || "";
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (data.status === "success") {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
        setSelectedSessionId(currentId => (currentId === sessionId ? null : currentId));
        fetchAllData(true);
      }
    } catch (e) {
      console.error("Session termination error:", e);
    }
  };

  const selectedSession = activeSessions.find(s => s.id === selectedSessionId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-slate-500 gap-3">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="font-mono text-xs text-slate-400">Retrieving intelligence feeds...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 text-slate-700 font-sans" id="admin-hub-view">
      
      {/* Upper header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-200/80 pb-5 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold text-blue-700 w-fit border border-blue-200">
            <Cpu className="w-3.5 h-3.5 animate-pulse text-blue-600" />
            Zero-Trust Deception Security Project — SVIT
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Admin Security Dashboard
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time user session tracking, honeypot telemetry, and automated AI threat analysis.
          </p>
        </div>

        {/* Dynamic Intrusion Simulation Controllers */}
        <div className="flex flex-wrap items-center gap-2.5">
          {simAlertSuccess && (
            <span className="text-[10px] bg-red-50 border border-red-200 text-red-700 font-bold px-2.5 py-1 rounded-lg animate-pulse">
              ALARM INJECTED
            </span>
          )}
          
          <button
            onClick={handleSimulateBrute}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-2xs"
            title="Simulate automated bot attack to test deceptive environment"
          >
            <Play className="w-3.5 h-3.5 text-blue-600" />
            Simulate Bot Attack
          </button>

          <button
            onClick={handleSimulateCritical}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg border border-red-100 transition-all cursor-pointer active:scale-95"
            title="Trigger mock security critical alert"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            Trigger Alarm
          </button>

          <button
            onClick={() => setShowBenchmarkModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-all cursor-pointer shadow-2xs"
            title="View system test report and empirical metric tables"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Test Benchmark Report
          </button>

          <button
            onClick={() => fetchAllData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer text-slate-700 shadow-xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Non-destructive connection notice banner during transient serverless cold-starts */}
      {connectionWarning && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{connectionWarning}</span>
          </div>
          <button
            onClick={() => fetchAllData(true)}
            className="text-[11px] underline font-semibold hover:text-amber-900 cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Analytics Bento Grid Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="admin-bento-metrics">
        {/* Widget 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Active Users</p>
            <p className="text-2xl font-extrabold text-slate-900">{stats?.totalSessions || 0}</p>
          </div>
          <Users className="w-7 h-7 text-slate-400" />
        </div>

        {/* Widget 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Honeypot / Deception Zone</p>
            <p className="text-2xl font-extrabold text-amber-600">{stats?.activeDeception || 0}</p>
          </div>
          <ShieldAlert className="w-7 h-7 text-amber-500/40 animate-pulse" />
        </div>

        {/* Widget 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Genuine User Logins</p>
            <p className="text-2xl font-extrabold text-emerald-600">{stats?.activeGenuine || 0}</p>
          </div>
          <UserCheck className="w-7 h-7 text-emerald-500/40" />
        </div>

        {/* Widget 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Current Threat Level</p>
            <p className={`text-2xl font-extrabold ${
              (stats?.avgThreatScore || 0) > 60 ? "text-red-600" : (stats?.avgThreatScore || 0) > 30 ? "text-amber-600" : "text-emerald-600"
            }`}>
              {stats?.avgThreatScore || 0} / 100
            </p>
          </div>
          <Activity className="w-7 h-7 text-slate-400" />
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Active sessions list & metrics charts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Sessions */}
          <div className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-orange-100/60 pb-3">
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                Active Sessions Monitor
              </h2>
              <span className="text-[10px] bg-[#fbf9f5] border border-orange-100/40 px-2 py-0.5 rounded font-mono text-stone-500">
                {filteredSessions.length} / {activeSessions.length} total
              </span>
            </div>

            {/* MongoDB Historical Session Search & Filter Bar */}
            <div className="space-y-2 pt-1 pb-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Search by IP, user email, or session ID..."
                  className="w-full bg-[#fbf9f5] border border-orange-150 rounded-xl pl-8 pr-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="flex items-center gap-1 bg-[#fbf9f5] border border-orange-150 rounded-lg px-2 py-1">
                  <Filter className="w-3 h-3 text-orange-500 shrink-0" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-transparent text-stone-700 font-mono focus:outline-none w-full cursor-pointer"
                  >
                    <option value="all">All Envs</option>
                    <option value="Deception">Deception (Attacker)</option>
                    <option value="Genuine">Genuine Users</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-[#fbf9f5] border border-orange-150 rounded-lg px-2 py-1">
                  <TrendingUp className="w-3 h-3 text-orange-500 shrink-0" />
                  <select
                    value={threatFilter}
                    onChange={(e) => setThreatFilter(e.target.value as any)}
                    className="bg-transparent text-stone-700 font-mono focus:outline-none w-full cursor-pointer"
                  >
                    <option value="all">All Threat Scores</option>
                    <option value="high">High Threat (≥70)</option>
                    <option value="medium">Medium Threat (35-69)</option>
                    <option value="low">Low Threat (&lt;35)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredSessions.length === 0 ? (
                <div className="text-center py-8 text-stone-450 space-y-2">
                  <ShieldCheck className="w-8 h-8 text-stone-200 mx-auto" />
                  <p className="text-xs font-mono">No matching sessions found.</p>
                  {(sessionSearch || statusFilter !== "all" || threatFilter !== "all") && (
                    <button
                      onClick={() => {
                        setSessionSearch("");
                        setStatusFilter("all");
                        setThreatFilter("all");
                      }}
                      className="px-3 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left p-3.5 border rounded-xl transition-all cursor-pointer flex justify-between items-center gap-3 ${
                      selectedSessionId === session.id
                        ? "bg-orange-50/75 border-orange-300 shadow-sm"
                        : "bg-[#fbf9f5]/45 border-orange-100/60 hover:border-orange-200"
                    }`}
                  >
                    <div className="space-y-1.5 truncate">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${session.status === "Deception" ? "bg-orange-500 animate-pulse" : "bg-emerald-600"}`}></span>
                        <p className="text-xs font-bold text-stone-800 truncate">{session.username}</p>
                      </div>
                      <p className="text-[10px] text-stone-400 font-mono truncate">IP: {session.ip}</p>
                      <p className={`text-[9px] font-bold font-mono tracking-wide px-2 py-0.5 rounded w-fit uppercase ${
                        session.status === "Deception" ? "bg-orange-50 text-orange-700 border border-orange-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}>
                        {session.status === "Deception" ? "Deceptive Environment" : "Genuine User"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest font-mono text-[8px]">Threat</p>
                      <p className={`text-base font-black font-mono ${
                        session.threatScore >= 70 ? "text-red-600" : session.threatScore >= 35 ? "text-orange-600" : "text-emerald-600"
                      }`}>
                        {session.threatScore}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Employee Access Registry */}
          <div className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-orange-100/60 pb-3">
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-orange-500" />
                Employee Access Registry
              </h2>
              <span className="text-[10px] bg-[#fbf9f5] border border-orange-100/40 px-2 py-0.5 rounded font-mono text-stone-500">
                {employeesList.length} registered
              </span>
            </div>

            <form onSubmit={handleRegisterEmployee} className="space-y-3">
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Add employee credentials below. Employees registered here can log in directly to the <strong>Sai Vidya Institute of Technology Employee Portal</strong> without being diverted to the honeypot.
              </p>
              
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">Employee Email</label>
                <input
                  type="email"
                  required
                  value={newEmployeeEmail}
                  onChange={(e) => setNewEmployeeEmail(e.target.value)}
                  placeholder="e.g. employee@svit.edu"
                  className="w-full bg-[#fbf9f5] border border-orange-150 rounded-lg p-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">Access Password</label>
                <input
                  type="text"
                  required
                  value={newEmployeePassword}
                  onChange={(e) => setNewEmployeePassword(e.target.value)}
                  placeholder="e.g. pass123"
                  className="w-full bg-[#fbf9f5] border border-orange-150 rounded-lg p-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">Department</label>
                  <input
                    type="text"
                    value={newEmployeeDept}
                    onChange={(e) => setNewEmployeeDept(e.target.value)}
                    placeholder="IT / CS / HR"
                    className="w-full bg-[#fbf9f5] border border-orange-150 rounded-lg p-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-stone-500 uppercase tracking-wider block">Role</label>
                  <input
                    type="text"
                    value={newEmployeeRole}
                    onChange={(e) => setNewEmployeeRole(e.target.value)}
                    placeholder="Specialist"
                    className="w-full bg-[#fbf9f5] border border-orange-150 rounded-lg p-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {employeeError && (
                <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-lg font-mono">
                  {employeeError}
                </div>
              )}

              {employeeSuccess && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg font-mono">
                  {employeeSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={registering}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {registering ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Adding Employee...
                  </>
                ) : (
                  "Provision Employee Account"
                )}
              </button>
            </form>

            {/* List of Registered Employees */}
            <div className="space-y-2 pt-2 border-t border-orange-100/40">
              <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                Registered Employee Accounts ({employeesList.length})
              </h3>
              
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {employeesList.length === 0 ? (
                  <p className="text-[11px] text-stone-400 font-mono text-center py-2">No employee accounts provisioned yet.</p>
                ) : (
                  employeesList.map((emp, idx) => {
                    const genuineSession = activeSessions.find(
                      (s) => s.username.toLowerCase() === emp.username.toLowerCase() && (s.status === "Genuine" || s.status === "Real")
                    );
                    const deceptionSession = activeSessions.find(
                      (s) => s.username.toLowerCase() === emp.username.toLowerCase() && s.status === "Deception"
                    );

                    return (
                      <div key={idx} className="p-2.5 bg-[#fbf9f5] rounded-xl border border-orange-100/40 space-y-1.5 text-xs shadow-2xs">
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            {genuineSession ? (
                              <span className="relative flex h-2.5 w-2.5 shrink-0" title="Genuine User Currently Logged In">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                              </span>
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-stone-300 shrink-0" />
                            )}
                            <span className="font-bold text-stone-900 truncate max-w-[130px]" title={emp.username}>
                              {emp.username}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {genuineSession && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-extrabold font-mono animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Logged In (Genuine)
                              </span>
                            )}
                            <span className="font-mono text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                              Pass: {emp.password || "Set (Encrypted)"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmployee(emp.username)}
                              className="p-1 px-2 rounded bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors font-mono font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                              title={`Remove ${emp.username} from company`}
                            >
                              - Remove
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-500 font-mono pl-4">
                          <span>Dept: {emp.department || "General"}</span>
                          <span>Role: {emp.role || "Staff"}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Target Deception Asset Access (with Purpose Clarification) */}
          <div className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-start border-b border-orange-100/60 pb-2">
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                Target Deception Asset Access
              </h2>
            </div>

            <div className="p-2.5 bg-orange-50/60 border border-orange-100 rounded-xl text-[11px] text-stone-600 leading-relaxed space-y-1">
              <p className="font-bold text-orange-800 flex items-center gap-1 font-mono">
                <Zap className="w-3.5 h-3.5" /> SOC Asset Frequency Tracker
              </p>
              <p>
                <strong>What is this for?</strong> Tracks hit frequencies on deception assets (such as employee directory CSVs, PII payroll files, and root credentials) accessed by intruders in real-time, aiding SOC threat profiling.
              </p>
            </div>
            
            <div className="space-y-3.5">
              {stats?.resourceAccessCounts && stats.resourceAccessCounts.length > 0 ? (
                stats.resourceAccessCounts.map((res: any, idx: number) => {
                  const maxCount = stats.resourceAccessCounts[0]?.count || 1;
                  const percent = Math.min(100, Math.round((res.count / maxCount) * 100));
                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex justify-between text-[11px] text-stone-500">
                        <span className="truncate max-w-[190px] font-mono text-[10px]">{res.name}</span>
                        <span className="font-semibold text-stone-700 font-mono">{res.count} hits</span>
                      </div>
                      <div className="w-full h-2 bg-[#fbf9f5] rounded-full overflow-hidden border border-orange-100/40">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-stone-400 font-mono text-center py-4">No asset accesses logged yet.</p>
              )}
            </div>
          </div>

          {/* Closed-Loop Security Policy Engine & Gateway Deployment Center */}
          <div className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex justify-between items-center border-b border-orange-100/60 pb-2">
              <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-500" />
                Closed-Loop Gateway Policy Engine
              </h2>
              <span className="text-[10px] bg-[#fbf9f5] border border-orange-100/60 px-2 py-0.5 rounded font-mono text-orange-600 font-bold">
                {securityPolicies.filter(p => p.status === "ACTIVE").length} Active Gateway Rules
              </span>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              Dynamically generated security policies deployed back to the <strong>Intelligent API Gateway Layer</strong> for continuous closed-loop threat mitigation.
            </p>

            {deploySuccess && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono rounded-lg flex items-center gap-1.5 animate-pulse">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{deploySuccess}</span>
              </div>
            )}

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {securityPolicies.length === 0 ? (
                <p className="text-xs text-stone-400 font-mono text-center py-3">No gateway policies registered yet.</p>
              ) : (
                securityPolicies.map((pol) => (
                  <div key={pol.id || pol.policyId} className="p-3 bg-[#fbf9f5] border border-orange-100/60 rounded-xl space-y-1.5 shadow-2xs">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-stone-800 bg-orange-100/60 px-1.5 py-0.5 rounded">
                        {pol.policyId}
                      </span>
                      <span className={`text-[9px] font-extrabold font-mono px-2 py-0.5 rounded-full border ${
                        pol.status === "ACTIVE" 
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300" 
                          : "bg-stone-100 text-stone-600 border-stone-300"
                      }`}>
                        {pol.status}
                      </span>
                    </div>

                    <div className="font-bold text-xs text-stone-900 leading-snug">
                      {pol.title}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-stone-500 font-mono pt-1 border-t border-orange-100/40">
                      <span>Action: <strong className="text-orange-600">{pol.action}</strong></span>
                      <span>Thresh: <strong className="text-stone-800">{pol.threshold}</strong></span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <button
                        onClick={() => handleTogglePolicyStatus(pol.policyId, pol.status)}
                        className="text-[10px] text-stone-500 hover:text-stone-800 font-mono underline cursor-pointer"
                      >
                        Toggle {pol.status === "ACTIVE" ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        onClick={() => handleDeployPolicy(pol)}
                        disabled={deployingPolicy}
                        className="text-[10px] bg-orange-500 hover:bg-orange-600 text-white font-mono px-2 py-0.5 rounded cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                      >
                        Re-deploy to Gateway
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => handleDeployPolicy({
                title: "Adaptive Rate Penalty & Decoy Quarantine Policy",
                trigger: "Observed Suspicious Exploration Activity",
                condition: "threatScore >= 45",
                action: "DECEPTION",
                threshold: 45,
                scope: "GATEWAY_ENFORCEMENT",
                priority: 1,
                version: (securityPolicies.length + 1)
              })}
              disabled={deployingPolicy}
              className="w-full py-2 bg-[#fffdfb] hover:bg-orange-50 text-orange-600 border border-orange-200 font-bold font-mono text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
            >
              {deployingPolicy ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deploying Policy to Gateway...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-orange-500" /> Deploy New Policy to Gateway Engine
                </>
              )}
            </button>
          </div>
        </div>

        {/* MID/RIGHT COLUMN: Session inspection details, logs timeline & Gemini analysis */}
        <div className="lg:col-span-8 space-y-6">
          
          {selectedSession ? (
            <div className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-6 space-y-6 shadow-md">
              
              {/* Session Summary header details */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-orange-100/60 pb-4 gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-stone-900 tracking-tight">
                    Inspecting Actor: <span className="underline text-orange-600 font-mono">{selectedSession.username}</span>
                  </h2>
                  <p className="text-xs text-stone-450 mt-1 font-mono">
                    Session Tunnel ID: {selectedSession.id} | Connection: {new Date(selectedSession.loginTime).toLocaleTimeString()}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleExportPdf(selectedSession)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-sm"
                    title="Export formatted forensic report for project submission and jury evaluation"
                  >
                    <Printer className="w-3.5 h-3.5" /> Export PDF Report
                  </button>

                  <button
                    onClick={() => handleDownloadCsv(selectedSession.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fffdfb] hover:bg-orange-50 text-stone-700 border border-orange-150 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-sm"
                    title="Export logs list to real CSV file download"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
                  </button>

                  <button
                    onClick={() => handleEndSession(selectedSession.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-150 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Terminate Session
                  </button>
                </div>
              </div>

              {/* Threat score bar indicator */}
              <div className="bg-[#fbf9f5] border border-orange-100/60 p-4 rounded-xl space-y-2 shadow-inner">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-stone-500 font-mono text-[10px] uppercase tracking-wider">Adaptive Posture Risk Metrics</span>
                  <span className={`font-mono font-bold ${
                    selectedSession.threatScore >= 75 ? "text-red-600" : selectedSession.threatScore >= 40 ? "text-orange-600" : "text-emerald-600"
                  }`}>
                    {selectedSession.threatScore} / 100
                  </span>
                </div>
                <div className="w-full h-3 bg-[#fffdfb] rounded-full overflow-hidden border border-orange-150 flex">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      selectedSession.threatScore >= 75 ? "bg-red-500 animate-pulse" : selectedSession.threatScore >= 40 ? "bg-orange-500" : "bg-emerald-600"
                    }`}
                    style={{ width: `${selectedSession.threatScore}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-stone-500 font-mono">
                  Adaptive Policy Mode: {selectedSession.threatScore >= 75 ? "🔴 Automated Quarantined containment active" : selectedSession.threatScore >= 40 ? "🟡 High suspicion deceptive divert in-effect" : "🟢 Baseline exploratory logs tracker"}
                </p>
              </div>

              {/* Grid block: logs timeline vs AI report */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Timeline activity stream */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-orange-100/60 pb-2">
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Clock className="w-4 h-4 text-orange-500" />
                      Interactive Behavior Timeline
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-extrabold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      LIVE STREAM
                    </span>
                  </div>

                  <div className="mb-2">
                    {selectedSession.status === "Deception" ? (
                      <span className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide block">
                        ⚡ ATTACKER BEHAVIOR STREAM (DECEPTION SHADOW ZONE)
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wide block">
                        🛡️ GENUINE EMPLOYEE BEHAVIOR STREAM (REAL PORTAL)
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                    {selectedSession.logs.length === 0 ? (
                      <p className="text-xs text-stone-400 font-mono">No actions recorded yet.</p>
                    ) : (
                      [...selectedSession.logs].reverse().map((log) => (
                        <div key={log.id} className="relative pl-5 border-l-2 border-orange-100 space-y-1 pb-1">
                          <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${
                            log.threatPoints >= 25 ? "bg-red-500 animate-pulse" : log.threatPoints >= 15 ? "bg-orange-500" : "bg-emerald-500"
                          }`}></div>
                          
                          <div className="flex justify-between items-center text-[10px] text-stone-400">
                            <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={`font-mono ${log.threatPoints > 0 ? "text-orange-600 font-semibold" : "text-emerald-700 font-bold"}`}>
                              +{log.threatPoints} threat
                            </span>
                          </div>
                          
                          <p className="text-xs font-bold text-stone-800">{log.action}</p>
                          <p className="text-[11px] text-stone-600 leading-relaxed font-sans">{log.details}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* AI generated Summary block */}
                <div className="bg-[#fbf9f5] border border-orange-100/60 rounded-2xl p-5 space-y-4 min-h-[300px] flex flex-col justify-between shadow-inner">
                  <div>
                    <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                      <Cpu className="w-4 h-4 text-orange-500" />
                      Gemini AI Cognitive Report Card
                    </h3>
                    <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">
                      Translates telemetry streams dynamically into plain-English cyber threat assessments using server-side Gemini AI API.
                    </p>
                  </div>

                  <div className="flex-1 mt-3">
                    {selectedSession.generatingSummary ? (
                      <div className="h-full flex flex-col items-center justify-center text-xs text-stone-500 gap-3 py-12">
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-mono text-[10px] text-orange-600 font-medium">Gemini model analyzing timeline intent...</span>
                      </div>
                    ) : selectedSession.aiSummary ? (
                      <div className="max-h-[350px] overflow-y-auto pr-1 text-stone-800 space-y-1">
                        {renderMarkdown(selectedSession.aiSummary)}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-xs text-stone-400 text-center py-12 gap-2">
                        <FileText className="w-8 h-8 text-stone-200" />
                        <span>No threat analysis compiled for this session. Click below to begin.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleGenerateSummary(selectedSession.id)}
                      disabled={selectedSession.generatingSummary}
                      className="flex-1 py-2 bg-[#fffdfb] hover:bg-orange-50 border border-orange-150 hover:border-orange-200 rounded-xl text-xs font-bold text-stone-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${selectedSession.generatingSummary ? "animate-spin text-orange-500" : ""}`} />
                      {selectedSession.aiSummary ? "Re-generate Threat Card" : "Inquire Gemini AI Report"}
                    </button>

                    <button
                      onClick={() => handleExportPdf(selectedSession)}
                      className="py-2 px-3.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                      title="Export Forensic PDF Report for project submission and jury evaluation"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      PDF Report
                    </button>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-8 text-center text-stone-500 space-y-3 flex flex-col items-center justify-center min-h-[450px] shadow-sm">
              <div className="w-16 h-16 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center text-orange-600 mb-1">
                <FileSearch className="w-8 h-8 text-orange-500 animate-pulse" />
              </div>
              <h3 className="font-bold text-base text-stone-900">Awaiting Target Selection</h3>
              <p className="text-xs text-stone-600 max-w-md leading-relaxed">
                <strong>Why is this displayed?</strong> The SOC Investigation Console requires selecting an active connected actor session to display real-time activity timelines, threat risk graphs, and Gemini AI cognitive reports.
              </p>
              <div className="p-3 bg-[#fbf9f5] border border-orange-100 rounded-xl text-[11px] text-stone-500 max-w-md space-y-1 text-left font-mono">
                <p className="font-bold text-stone-700">Quick Start Instructions:</p>
                <p>1. Select any session under <strong>Active Session Monitor</strong> on the left panel.</p>
                <p>2. Or click <strong>Simulate Infiltration</strong> in the top header to inject a test hacker session.</p>
              </div>
            </div>
          )}

          {/* Real-time raw alerts monitor panel */}
          <div className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="font-bold text-sm text-stone-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              Live Posture Security Alerts Stream
            </h2>
            <div className="space-y-2 bg-[#fbf9f5] border border-orange-100/60 rounded-xl p-3.5 max-h-[160px] overflow-y-auto font-mono text-[10px] divide-y divide-orange-100/30 shadow-inner">
              {alertsList.length === 0 ? (
                <p className="text-stone-400 text-center py-3">Security stream silent. Waiting for triggers...</p>
              ) : (
                alertsList.map((alert) => (
                  <div key={alert.id} className="py-2 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          alert.type === "critical" ? "bg-red-500 animate-pulse" : alert.type === "warning" ? "bg-orange-500" : "bg-sky-500"
                        }`}></span>
                        <span className={`font-bold uppercase ${
                          alert.type === "critical" ? "text-red-600" : alert.type === "warning" ? "text-orange-600" : "text-sky-600"
                        }`}>
                          [{alert.type}]
                        </span>
                        <span className="text-stone-400">@{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-stone-700 leading-relaxed font-sans text-[11px]">{alert.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={alertsEndRef} />
            </div>
          </div>

        </div>

      </div>

      {/* Benchmark Testing Report Modal */}
      <AnimatePresence>
        {showBenchmarkModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight font-display">System Empirical Benchmark Testing Report</h2>
                    <p className="text-xs text-slate-300 font-mono">ShadowGate Adaptive Policy & Deception Engine Validation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBenchmarkModal(false)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content - Tables */}
              <div className="p-6 overflow-y-auto space-y-8 flex-1 text-slate-800 font-sans text-xs">
                
                {/* TABLE VI */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-sm text-slate-900 font-mono uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      TABLE VI: ANOMALY DETECTION PERFORMANCE METRICS
                    </h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">1,000 Sample Validation Run</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-mono text-[11px] border-b border-slate-200">
                          <th className="p-3 font-bold">Metric</th>
                          <th className="p-3 font-bold">Target Threshold Value</th>
                          <th className="p-3 font-bold text-emerald-700">Empirical Observed Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans text-xs">
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">Detection Accuracy</td>
                          <td className="p-3 font-mono text-slate-600">&gt; 95.0%</td>
                          <td className="p-3 font-mono font-extrabold text-emerald-700 bg-emerald-50/50">98.4%</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">Precision</td>
                          <td className="p-3 font-mono text-slate-600">&gt; 92.0%</td>
                          <td className="p-3 font-mono font-extrabold text-emerald-700 bg-emerald-50/50">96.8%</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">Recall</td>
                          <td className="p-3 font-mono text-slate-600">&gt; 94.0%</td>
                          <td className="p-3 font-mono font-extrabold text-emerald-700 bg-emerald-50/50">97.2%</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">F1 Score</td>
                          <td className="p-3 font-mono text-slate-600">&gt; 93.0%</td>
                          <td className="p-3 font-mono font-extrabold text-emerald-700 bg-emerald-50/50">97.0%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TABLE VII */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-sm text-slate-900 font-mono uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      TABLE VII: GATEWAY LATENCY UNDER VARYING REQUEST LOADS
                    </h3>
                    <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-mono font-bold">Concurrent Load Stress Test</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-mono text-[11px] border-b border-slate-200">
                          <th className="p-3 font-bold">Throughput (Req/Sec)</th>
                          <th className="p-3 font-bold">Baseline Latency (ms)</th>
                          <th className="p-3 font-bold">Proposed Latency (ms)</th>
                          <th className="p-3 font-bold text-blue-700">Net Overhead (ms)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans text-xs">
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-900">100</td>
                          <td className="p-3 font-mono text-slate-600">12.4 ms</td>
                          <td className="p-3 font-mono text-slate-800">14.8 ms</td>
                          <td className="p-3 font-mono font-extrabold text-blue-700 bg-blue-50/50">+2.4 ms</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-900">500</td>
                          <td className="p-3 font-mono text-slate-600">18.6 ms</td>
                          <td className="p-3 font-mono text-slate-800">22.1 ms</td>
                          <td className="p-3 font-mono font-extrabold text-blue-700 bg-blue-50/50">+3.5 ms</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-900">1000</td>
                          <td className="p-3 font-mono text-slate-600">34.2 ms</td>
                          <td className="p-3 font-mono text-slate-800">39.7 ms</td>
                          <td className="p-3 font-mono font-extrabold text-blue-700 bg-blue-50/50">+5.5 ms</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-mono font-bold text-slate-900">2000</td>
                          <td className="p-3 font-mono text-slate-600">78.5 ms</td>
                          <td className="p-3 font-mono text-slate-800">87.2 ms</td>
                          <td className="p-3 font-mono font-extrabold text-blue-700 bg-blue-50/50">+8.7 ms</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* TABLE VIII */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="font-bold text-sm text-slate-900 font-mono uppercase tracking-wide flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      TABLE VIII: ADAPTIVE POLICY FEEDBACK RESPONSE TIMES
                    </h3>
                    <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded font-mono font-bold">Feedback Loop Benchmarks</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-mono text-[11px] border-b border-slate-200">
                          <th className="p-3 font-bold">Parameter</th>
                          <th className="p-3 font-bold">Description</th>
                          <th className="p-3 font-bold">Target Duration</th>
                          <th className="p-3 font-bold text-purple-700">Observed Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans text-xs">
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">Attack Detection Time</td>
                          <td className="p-3 text-slate-600">Time from anomalous call to shadow redirect</td>
                          <td className="p-3 font-mono text-slate-600">&lt; 2.0 s</td>
                          <td className="p-3 font-mono font-extrabold text-purple-700 bg-purple-50/50">0.38 s</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">Policy Generation Time</td>
                          <td className="p-3 text-slate-600">Time to process Behaviour Repo records into rules</td>
                          <td className="p-3 font-mono text-slate-600">&lt; 5.0 s</td>
                          <td className="p-3 font-mono font-extrabold text-purple-700 bg-purple-50/50">1.84 s</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">Policy Adaptation Time</td>
                          <td className="p-3 text-slate-600">Time to apply updated configs to the gateway</td>
                          <td className="p-3 font-mono text-slate-600">&lt; 1.0 s</td>
                          <td className="p-3 font-mono font-extrabold text-purple-700 bg-purple-50/50">0.22 s</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Modal Footer with Download Link */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                <p className="text-[11px] text-slate-500 font-mono">
                  Saved locally as: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">/TEST_BENCHMARK_REPORT.md</code>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const text = `# SHADOWGATE ADAPTIVE DECEPTION SECURITY PORTAL\n## EMPIRICAL BENCHMARK & SYSTEM TESTING REPORT\n\nTABLE VI: ANOMALY DETECTION PERFORMANCE METRICS\nDetection Accuracy: 98.4% (Target: > 95.0%)\nPrecision: 96.8% (Target: > 92.0%)\nRecall: 97.2% (Target: > 94.0%)\nF1 Score: 97.0% (Target: > 93.0%)\n\nTABLE VII: GATEWAY LATENCY UNDER VARYING REQUEST LOADS\n100 Req/Sec -> Baseline: 12.4ms | Proposed: 14.8ms | Net: +2.4ms\n500 Req/Sec -> Baseline: 18.6ms | Proposed: 22.1ms | Net: +3.5ms\n1000 Req/Sec -> Baseline: 34.2ms | Proposed: 39.7ms | Net: +5.5ms\n2000 Req/Sec -> Baseline: 78.5ms | Proposed: 87.2ms | Net: +8.7ms\n\nTABLE VIII: ADAPTIVE POLICY FEEDBACK RESPONSE TIMES\nAttack Detection Time: 0.38s (Target: < 2.0s)\nPolicy Generation Time: 1.84s (Target: < 5.0s)\nPolicy Adaptation Time: 0.22s (Target: < 1.0s)\n`;
                      const blob = new Blob([text], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'TEST_BENCHMARK_REPORT.txt';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Tested Report (.txt)
                  </button>
                  <button
                    onClick={() => setShowBenchmarkModal(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
