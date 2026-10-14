import React, { useState, useEffect, useRef } from "react";
import {
  FolderLock,
  Terminal as TerminalIcon,
  Database,
  Search,
  Key,
  DollarSign,
  User,
  LogOut,
  ChevronRight,
  FileText,
  Lock,
  Download,
  AlertTriangle,
  Play,
  Send,
  Check,
  Cpu,
  Globe,
  Plus,
  Trash2,
  FileCode,
  LockOpen,
  CloudUpload,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DeceptionDashboardProps {
  session: any;
  onLogout: () => void;
}

export default function DeceptionDashboard({ session, onLogout }: DeceptionDashboardProps) {
  const [activeTab, setActiveTab] = useState<"employees" | "vault" | "secrets" | "terminal" | "search">("employees");
  
  // Interactive File Explorer (Vault) & Uploader State
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [decryptProgress, setDecryptProgress] = useState(0);
  const [customFileContent, setCustomFileContent] = useState("");
  const [customFileName, setCustomFileName] = useState("");
  const [customFileSensitive, setCustomFileSensitive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Classified Employee Records Database State
  const [employeeRecords, setEmployeeRecords] = useState([
    { id: "EMP-2026-01", name: "Dr. Rajesh Kumar", role: "Dean of Academic Affairs", dept: "Administration", salary: "$145,000", email: "rajesh.k@svit.edu", ssn: "982-10-9812", bank: "HDFC Bank (Acct: ****4920)" },
    { id: "EMP-2026-02", name: "Ananya Sharma", role: "Head of Information Security", dept: "IT Systems", salary: "$128,000", email: "ananya.s@svit.edu", ssn: "451-22-3104", bank: "ICICI Bank (Acct: ****8812)" },
    { id: "EMP-2026-03", name: "Vikram Sengupta", role: "Lead Systems Architect", dept: "Cyber Operations", salary: "$118,000", email: "vikram.s@svit.edu", ssn: "882-01-7429", bank: "SBI Bank (Acct: ****3019)" },
    { id: "EMP-2026-04", name: "Meera Nair", role: "Director of HR & Staff Registry", dept: "Human Resources", salary: "$105,000", email: "meera.n@svit.edu", ssn: "319-40-1092", bank: "Axis Bank (Acct: ****5521)" },
    { id: "EMP-2026-05", name: "Suresh Reddy", role: "Senior Financial Controller", dept: "Finance & Payroll", salary: "$112,000", email: "suresh.r@svit.edu", ssn: "710-33-6043", bank: "Canara Bank (Acct: ****1940)" }
  ]);
  const [searchEmp, setSearchEmp] = useState("");

  // Interactive Secrets Registry State
  const [secrets, setSecrets] = useState([
    { id: "sec_1", key: "AWS_ACCESS_KEY_ID", value: "AKIAIOSFODNN7EXAMPLE", sensitive: "Critical", revealed: false },
    { id: "sec_2", key: "AWS_SECRET_ACCESS_KEY", value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", revealed: false, sensitive: "Critical" },
    { id: "sec_3", key: "POSTGRES_MASTER_PASSWORD", value: "vault_master_db_root_pass_920%", revealed: false, sensitive: "Critical" },
    { id: "sec_4", key: "JWT_SECRET_SIGNING_KEY", value: "9a626a5be893ef10d8bbec9b26d84f886475fa3d16b", revealed: false, sensitive: "High" }
  ]);
  const [newSecretKey, setNewSecretKey] = useState("");
  const [newSecretValue, setNewSecretValue] = useState("");
  const [newSecretSensitive, setNewSecretSensitive] = useState("High");

  // Terminal State & Auto-scroll Ref
  const [cmdHistory, setCmdHistory] = useState<{ type: "cmd" | "out" | "error"; text: string }[]>([
    { type: "out", text: "Deception Node v1.0 Shell" },
    { type: "out", text: "Initializing high-fidelity isolation sandbox node... ONLINE." },
    { type: "out", text: "Privileges: ROOT / ADMINISTRATOR. Type 'help' to review diagnostics commands." }
  ]);
  const [currentCmd, setCurrentCmd] = useState("");
  const termEndRef = useRef<HTMLDivElement>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Authentication & session headers helper for stealth telemetry
  const getDeceptionHeaders = () => {
    const token = localStorage.getItem("jwt_token") || "";
    return {
      "Content-Type": "application/json",
      "x-session-id": session?.id || "",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };
  };

  // Silent reporting tracker
  const silentReport = async (action: string, details: string, threatPoints: number) => {
    try {
      await fetch(`/api/deception/action/${session.id}`, {
        method: "POST",
        headers: getDeceptionHeaders(),
        body: JSON.stringify({ action, details, threatPoints })
      });
    } catch (e) {
      console.warn("Silent telemetry failed (ignored for user stealth)", e);
    }
  };

  // Log initial entry into deception environment
  useEffect(() => {
    silentReport("Entered Deception Environment", "Actor successfully completed suspicious login and was rerouted to deceptive environment", 10);
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const res = await fetch(`/api/deception/files/${session.id}`, {
        headers: getDeceptionHeaders()
      });
      const data = await res.json();
      if (data.status === "success") {
        setFiles(data.files);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    silentReport("Tab Navigation", `Switched control view to '${tab.toUpperCase()}' component`, 5);
  };

  // Dynamic File Viewing & Decryption simulation
  const handleViewFile = async (fileName: string) => {
    setLoadingFile(true);
    setSelectedFile(null);
    setDecryptProgress(0);
    silentReport("Triggered Document Preview", `Requested reading pane for file '${fileName}'`, 15);

    // Dynamic decryption percentage increments
    const interval = setInterval(() => {
      setDecryptProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    try {
      // First try calling backend
      const res = await fetch(`/api/deception/file/${session.id}/${encodeURIComponent(fileName)}`, {
        headers: getDeceptionHeaders()
      });
      const data = await res.json();
      if (data.status === "success") {
        setTimeout(() => {
          setSelectedFile(data.file);
          setLoadingFile(false);
          silentReport("Document Decrypted Successfully", `Finished rendering secure document viewer for '${fileName}'`, 10);
        }, 1200);
      } else {
        throw new Error(data.message || "Failed to load file");
      }
    } catch (e) {
      // Fallback to local files if recently uploaded
      const localMatch = files.find(f => f.name === fileName);
      setTimeout(() => {
        setSelectedFile(localMatch || { name: fileName, type: "txt", size: "1 KB", content: "FILE DECRYPTED IN MEMORY. SECURE DATA STORAGE BASELINE." });
        setLoadingFile(false);
        silentReport("Document Decrypted Successfully", `Finished rendering secure document viewer for '${fileName}'`, 10);
      }, 1200);
    }
  };

  // File Uploading simulation
  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string || "";
      const newFileObj = {
        name: file.name,
        type: file.name.split(".").pop() || "txt",
        size: (file.size / 1024).toFixed(1) + " KB",
        sensitive: true,
        content: content.substring(0, 1000) || "Dynamic file upload. Content initialized securely."
      };

      setFiles(prev => [newFileObj, ...prev]);
      silentReport("Uploaded Custom Payload File", `Transmitted payload file to deceptive environment repository: '${file.name}'`, 20);
    };
    reader.readAsText(file);
  };

  const handleCustomFileCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFileName) return;

    const formattedName = customFileName.includes(".") ? customFileName : customFileName + ".txt";
    const newFileObj = {
      name: formattedName,
      type: formattedName.split(".").pop() || "txt",
      size: "1.2 KB",
      sensitive: customFileSensitive,
      content: customFileContent || "Default empty initialization content."
    };

    setFiles(prev => [newFileObj, ...prev]);
    setCustomFileName("");
    setCustomFileContent("");
    setCustomFileSensitive(false);
    silentReport("Created Custom Filesystem Object", `Injected new file item into filesystem database: '${formattedName}'`, 15);
  };

  // Employee Records Download Logic
  const handleDownloadEmployeeCSV = () => {
    let csv = "Employee ID,Full Name,Role / Title,Department,Annual Salary,Email Address,SSN / Gov ID,Direct Deposit Bank Account\n";
    employeeRecords.forEach(emp => {
      csv += `"${emp.id}","${emp.name}","${emp.role}","${emp.dept}","${emp.salary}","${emp.email}","${emp.ssn}","${emp.bank}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "SVIT_Classified_Employee_Directory_2026.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    silentReport("Downloaded Employee Details CSV", "Actor downloaded classified employee directory with full salary and PII details", 35);
  };

  const handleDownloadEmployeeJSON = () => {
    const jsonStr = JSON.stringify(employeeRecords, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "SVIT_Employee_Payroll_PII_Payload.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    silentReport("Exported Employee PII Payload", "Actor exported raw JSON database containing confidential staff PII and bank details", 35);
  };

  const handleDownloadSingleEmployee = (emp: any) => {
    const content = `=====================================================
SAI VIDYA INSTITUTE OF TECHNOLOGY - CONFIDENTIAL STAFF RECORD
=====================================================
Employee ID:       ${emp.id}
Full Name:         ${emp.name}
Role / Title:      ${emp.role}
Department:        ${emp.dept}
Email Address:     ${emp.email}
Salary:            ${emp.salary}
Tax Identifier:    ${emp.ssn}
Direct Deposit:    ${emp.bank}
Security Level:    RESTRICTED - LEVEL 4
=====================================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${emp.id}_${emp.name.replace(/\s+/g, '_')}_Record.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    silentReport("Downloaded Single Employee File", `Actor downloaded individual personnel file for ${emp.name} (${emp.id})`, 30);
  };

  // Custom Secrets Interactive Adding
  const handleAddSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecretKey || !newSecretValue) return;

    const newSec = {
      id: "sec_" + Math.random().toString(36).substring(2, 7),
      key: newSecretKey.toUpperCase().replace(/\s+/g, "_"),
      value: newSecretValue,
      sensitive: newSecretSensitive,
      revealed: false
    };

    setSecrets(prev => [...prev, newSec]);
    setNewSecretKey("");
    setNewSecretValue("");
    silentReport("Injected Custom Environment Secret", `Configured new secret variable config: '${newSec.key}'`, 20);
  };

  const handleRevealSecret = (id: string) => {
    setSecrets(prev =>
      prev.map(sec => {
        if (sec.id === id) {
          const newState = !sec.revealed;
          if (newState) {
            silentReport("Revealed Confidential Secret", `Exposed credentials value for variable: '${sec.key}'`, 30);
          }
          return { ...sec, revealed: newState };
        }
        return sec;
      })
    );
  };

  // SSH Terminal Execution Logic
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCmd.trim()) return;

    const cmdLine = currentCmd;
    setCurrentCmd("");
    setCmdHistory(prev => [...prev, { type: "cmd", text: cmdLine }]);

    const parts = cmdLine.trim().split(" ");
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" ");

    silentReport("Terminal Command Execution", `Ran terminal command: '${cmdLine}'`, 25);

    // Clear output is local
    if (cmd === "clear" || cmd === "cls") {
      setCmdHistory([]);
      return;
    }

    // Interactive ls command reflecting custom created/uploaded files
    if (cmd === "ls" || cmd === "dir") {
      const fileLines = files.map(f => `${f.size.padEnd(10)}  ${f.name}`).join("\n");
      const defaultLines = "1.7 KB      private_ssh_key_root.pem\n185 KB      customer_pii_export_raw.csv";
      setCmdHistory(prev => [...prev, { type: "out", text: fileLines || defaultLines }]);
      return;
    }

    // Interactive cat command reflecting custom files
    if (cmd === "cat") {
      if (!arg) {
        setCmdHistory(prev => [...prev, { type: "error", text: "Usage: cat [filename]" }]);
        return;
      }
      const matched = files.find(f => f.name.toLowerCase() === arg.toLowerCase());
      if (matched) {
        silentReport("Read Document Content", `Read file content of '${matched.name}' using terminal`, matched.sensitive ? 30 : 5);
        setCmdHistory(prev => [...prev, { type: "out", text: matched.content || "File content is blank." }]);
      } else {
        setCmdHistory(prev => [...prev, { type: "error", text: `cat: ${arg}: No such file or directory` }]);
      }
      return;
    }

    // Interactive secrets display command
    if (cmd === "secrets") {
      const secretOutput = secrets.map(sec => `${sec.key.padEnd(30)}  [${sec.sensitive}]  ${sec.value}`).join("\n");
      silentReport("Queried Terminal Secrets Dump", "Executed 'secrets' instruction command to dumping decrypted keys", 35);
      setCmdHistory(prev => [...prev, { type: "out", text: secretOutput }]);
      return;
    }

    // Try API fetch for default system diagnostics outputs
    try {
      const res = await fetch(`/api/deception/terminal/${session.id}`, {
        method: "POST",
        headers: getDeceptionHeaders(),
        body: JSON.stringify({ command: cmdLine })
      });
      const data = await res.json();
      if (data.status === "success") {
        setCmdHistory(prev => [...prev, { type: "out", text: data.output }]);
      }
    } catch (e) {
      setCmdHistory(prev => [...prev, { type: "error", text: "Link command processor timeout." }]);
    }
  };

  // Automatically scroll terminal to bottom
  useEffect(() => {
    if (termEndRef.current) {
      termEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [cmdHistory]);

  // Global Search Engine reflecting interactive state
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    const query = searchQuery.trim().toLowerCase();

    // Trigger threat tracking based on keywords and report via backend API
    const highThreatKeywords = ["admin", "root", "password", "key", "secret", "db", "leak", "hack", "payment", "credit"];
    const matchesKeyword = highThreatKeywords.some(kw => query.includes(kw));
    silentReport("Global Search Console Query", `Searched deception logs database for query: '${searchQuery}'`, matchesKeyword ? 25 : 5);

    // Call server-side search endpoint to trigger persistent server-side deception telemetry
    fetch(`/api/deception/search/${session.id}`, {
      method: "POST",
      headers: getDeceptionHeaders(),
      body: JSON.stringify({ query: searchQuery.trim() })
    }).catch(err => console.warn("Backend search telemetry ping:", err));

    setTimeout(() => {
      const results: any[] = [];

      // Search matching files
      files.forEach(f => {
        if (f.name.toLowerCase().includes(query) || (f.content && f.content.toLowerCase().includes(query))) {
          results.push({ type: "File Vault Asset", name: f.name, desc: `Location: /vault/files/ | Size: ${f.size}` });
        }
      });

      // Search matching secrets
      secrets.forEach(sec => {
        if (sec.key.toLowerCase().includes(query) || sec.value.toLowerCase().includes(query)) {
          results.push({ type: "Environmental Variable Config", name: sec.key, desc: `Classification: [${sec.sensitive}] Credential Vault` });
        }
      });

      // Search employee records
      employeeRecords.forEach(emp => {
        if (emp.name.toLowerCase().includes(query) || emp.role.toLowerCase().includes(query) || emp.dept.toLowerCase().includes(query)) {
          results.push({ type: "Classified Employee Record", name: `${emp.name} (${emp.id})`, desc: `Role: ${emp.role} | Dept: ${emp.dept}` });
        }
      });

      setSearchResults(results);
      setSearching(false);
    }, 800);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 text-slate-700" id="deception-dashboard-view">
      
      {/* Immersive Cyber-Slate Header */}
      <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50/80 border border-indigo-200/80 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
            <LockOpen className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
              <p className="text-[10px] font-mono font-bold tracking-widest text-indigo-700 uppercase">SVIT Corporate Internal Administration Activated</p>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Deception Core Administration Console</h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Secure Tunnel Ref: <span className="font-mono text-indigo-700 font-semibold">{session.id}</span> | Identity: <span className="font-mono underline text-slate-800 font-semibold">{session.username}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-white" />
          Emergency Gateway Disconnect
        </button>
      </div>

      {/* Grid splits: Controller Tabs vs Main Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Highly Polished Navigation Cards */}
        <div className="lg:col-span-3 space-y-4">
          
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 space-y-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono border-b border-slate-200/80 pb-2.5 mb-3">
              Administrative Nodes
            </h3>
            
            <div className="space-y-1.5">
              {/* Tab Button 1 */}
              <button
                onClick={() => handleTabChange("employees")}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "employees"
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent font-extrabold shadow-sm"
                    : "bg-slate-50/70 border-slate-200/70 text-slate-600 hover:text-slate-950 hover:bg-indigo-50/50 hover:border-indigo-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" /> Employee Database & PII
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Tab Button 2 */}
              <button
                onClick={() => handleTabChange("vault")}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "vault"
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent font-extrabold shadow-sm"
                    : "bg-slate-50/70 border-slate-200/70 text-slate-600 hover:text-slate-950 hover:bg-indigo-50/50 hover:border-indigo-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <FolderLock className="w-4 h-4" /> File Vault Explorer
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Tab Button 3 */}
              <button
                onClick={() => handleTabChange("secrets")}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "secrets"
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent font-extrabold shadow-sm"
                    : "bg-slate-50/70 border-slate-200/70 text-slate-600 hover:text-slate-950 hover:bg-indigo-50/50 hover:border-indigo-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Key className="w-4 h-4" /> Credentials Registry
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Tab Button 4 */}
              <button
                onClick={() => handleTabChange("terminal")}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "terminal"
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent font-extrabold shadow-sm"
                    : "bg-slate-50/70 border-slate-200/70 text-slate-600 hover:text-slate-950 hover:bg-indigo-50/50 hover:border-indigo-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <TerminalIcon className="w-4 h-4" /> Diagnostics Shell
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Tab Button 5 */}
              <button
                onClick={() => handleTabChange("search")}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  activeTab === "search"
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-transparent font-extrabold shadow-sm"
                    : "bg-slate-50/70 border-slate-200/70 text-slate-600 hover:text-slate-950 hover:bg-indigo-50/50 hover:border-indigo-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" /> Global System Query
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Real-time Sandbox parameters display */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-5 text-xs text-slate-600 space-y-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider font-mono text-[10px] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" /> System Metrics
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>CPU Thread Load</span>
                <span className="font-mono text-indigo-600 font-bold">14.2%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600" style={{ width: "14%" }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Memory Allocation</span>
                <span className="font-mono text-indigo-600 font-bold">1.8 / 16 GB</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600" style={{ width: "11%" }}></div>
              </div>
            </div>

            <div className="border-t border-slate-200/80 pt-3 flex justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-emerald-600" /> Global CDN</span>
              <span className="text-emerald-700 uppercase font-bold tracking-wider">Active</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Active stage rendering Tab views */}
        <div className="lg:col-span-9">
          
          <AnimatePresence mode="wait">
            
            {/* TAB 1: Classified Employee Database & PII Export */}
            {activeTab === "employees" && (
              <motion.div
                key="employees"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-6 space-y-6 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-orange-100/60 pb-4 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
                        RESTRICTED HR ACCESS - LEVEL 4
                      </span>
                    </div>
                    <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-orange-500" />
                      Sai Vidya Institute of Technology - Staff Directory & Payroll Registry
                    </h2>
                    <p className="text-xs text-stone-500 mt-1">
                      Confidential institutional employee database. Export complete staff salary structure and direct deposit records.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={handleDownloadEmployeeCSV}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-white" />
                      Download Directory (.CSV)
                    </button>
                    <button
                      onClick={handleDownloadEmployeeJSON}
                      className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <FileCode className="w-4 h-4 text-white" />
                      Export Payroll PII (.JSON)
                    </button>
                  </div>
                </div>

                {/* Filter and Search */}
                <div className="flex items-center gap-3 bg-[#fbf9f5] border border-orange-100/60 p-2.5 rounded-xl">
                  <Search className="w-4 h-4 text-stone-400 ml-1" />
                  <input
                    type="text"
                    value={searchEmp}
                    onChange={(e) => setSearchEmp(e.target.value)}
                    placeholder="Search employee directory by name, department, or role..."
                    className="w-full bg-transparent text-xs text-stone-800 placeholder-stone-400 focus:outline-none"
                  />
                  {searchEmp && (
                    <button onClick={() => setSearchEmp("")} className="text-xs font-mono text-stone-400 hover:text-stone-700 px-2">
                      Clear
                    </button>
                  )}
                </div>

                {/* Employee Table */}
                <div className="overflow-x-auto border border-orange-100/60 rounded-xl bg-white shadow-sm">
                  <table className="w-full text-left text-xs divide-y divide-orange-100/60">
                    <thead className="bg-[#fbf9f5] text-stone-500 font-mono text-[10px] uppercase">
                      <tr>
                        <th className="p-3">Staff ID</th>
                        <th className="p-3">Employee Name</th>
                        <th className="p-3">Role & Title</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Salary</th>
                        <th className="p-3">Direct Deposit</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100/40 text-stone-700">
                      {employeeRecords
                        .filter(emp => 
                          !searchEmp || 
                          emp.name.toLowerCase().includes(searchEmp.toLowerCase()) || 
                          emp.dept.toLowerCase().includes(searchEmp.toLowerCase()) ||
                          emp.role.toLowerCase().includes(searchEmp.toLowerCase())
                        )
                        .map((emp) => (
                          <tr key={emp.id} className="hover:bg-orange-50/40 transition-colors">
                            <td className="p-3 font-mono font-bold text-orange-600">{emp.id}</td>
                            <td className="p-3 font-bold text-stone-900">{emp.name}</td>
                            <td className="p-3 text-stone-700 font-medium">{emp.role}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-stone-700 border border-stone-200">
                                {emp.dept}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-700">{emp.salary}</td>
                            <td className="p-3 font-mono text-[11px] text-stone-600">{emp.bank}</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleDownloadSingleEmployee(emp)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer"
                                >
                                  <Download className="w-3 h-3" /> Record
                                </button>
                                <button
                                  onClick={() => {
                                    setEmployeeRecords(prev => prev.filter(e => e.id !== emp.id));
                                    silentReport("Removed Staff Record", `Removed employee record ${emp.name} (${emp.id}) from system directory`, 15);
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold font-mono transition-colors cursor-pointer"
                                  title={`Remove ${emp.name} from company directory`}
                                >
                                  - Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 bg-[#fbf9f5] p-3 rounded-xl border border-orange-100/60">
                  <span>Total Confidential Staff Profiles: <strong>{employeeRecords.length} Active Records</strong></span>
                  <span className="text-emerald-700 font-bold">PII SHA-256 Checksum: Verified</span>
                </div>
              </motion.div>
            )}

            {/* TAB 2: Vault File Explorer & Dynamic Payload Uploading */}
            {activeTab === "vault" && (
              <motion.div
                key="vault"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-6 space-y-6 shadow-sm"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-orange-100/60 pb-4 gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                      <FolderLock className="w-5 h-5 text-orange-500" />
                      Classified File Vault Explorer
                    </h2>
                    <p className="text-xs text-stone-500 mt-1">
                      Query root servers for classified intellectual blueprints. View document content by completing real-time RSA cryptosystems handshakes.
                    </p>
                  </div>

                  {/* Dynamic file upload trigger */}
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".txt,.csv,.json,.yaml,.pem,.docx,.pdf"
                    />
                    <button
                      onClick={handleFileUploadClick}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100/80 border border-orange-200 text-xs font-bold rounded-lg text-orange-700 cursor-pointer transition-colors shadow-sm"
                    >
                      <CloudUpload className="w-4 h-4" /> Upload Custom Payload
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* File List */}
                  <div className="md:col-span-5 space-y-4">
                    
                    {/* Inline Quick File Creator */}
                    <form onSubmit={handleCustomFileCreate} className="p-3 bg-[#fbf9f5] border border-orange-100/60 rounded-xl space-y-2 text-xs shadow-inner">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono text-[9px] font-bold text-stone-500 uppercase">In-Memory File Builder</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={customFileSensitive}
                            onChange={(e) => setCustomFileSensitive(e.target.checked)}
                            className="rounded border-orange-200 bg-[#fffdfb] text-orange-500 w-3 h-3"
                          />
                          <span className="text-[9px] font-mono text-orange-600 font-bold">Sensitive</span>
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={customFileName}
                          onChange={(e) => setCustomFileName(e.target.value)}
                          placeholder="blueprint_doc.txt"
                          className="flex-1 bg-[#fffdfb] border border-orange-150 rounded-lg p-1.5 text-[11px] text-stone-800 placeholder-stone-400 focus:outline-none"
                        />
                        <button
                          type="submit"
                          className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-2.5 rounded-lg text-[10px] shadow-sm transition-colors"
                        >
                          Create
                        </button>
                      </div>
                      <input
                        type="text"
                        value={customFileContent}
                        onChange={(e) => setCustomFileContent(e.target.value)}
                        placeholder="Injected blueprint parameters..."
                        className="w-full bg-[#fffdfb] border border-orange-150 rounded-lg p-1.5 text-[11px] text-stone-800 placeholder-stone-400 focus:outline-none"
                      />
                    </form>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {files.map((file, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleViewFile(file.name)}
                          className="w-full text-left p-3 bg-[#fbf9f5] hover:bg-[#fffdfb] border border-orange-100/60 hover:border-orange-250 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <div className="w-8 h-8 bg-[#fffdfb] border border-orange-150 rounded-lg flex items-center justify-center text-orange-600 shrink-0 shadow-inner">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-stone-800 truncate">{file.name}</p>
                              <p className="text-[10px] text-stone-500 font-mono">Format: {file.type.toUpperCase()} | Size: {file.size}</p>
                            </div>
                          </div>

                          {file.sensitive && (
                            <span className="text-[9px] font-mono font-bold text-orange-700 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded shrink-0 uppercase">
                              Secured
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Document Reader Stage */}
                  <div className="md:col-span-7 bg-[#fbf9f5] border border-orange-100/60 rounded-2xl p-5 min-h-[350px] flex flex-col justify-between shadow-inner">
                    
                    {loadingFile ? (
                      <div className="flex-1 flex flex-col items-center justify-center space-y-3.5 text-xs text-stone-550 py-16">
                        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        <div className="w-full max-w-[200px] bg-[#fffdfb] h-1 rounded-full overflow-hidden border border-orange-150">
                          <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${decryptProgress}%` }}></div>
                        </div>
                        <span className="font-mono text-[10px] text-orange-700 font-bold">Performing RSA 2048 Bit Handshaking: {decryptProgress}%</span>
                      </div>
                    ) : selectedFile ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-orange-100/60 pb-3">
                          <div>
                            <h3 className="text-xs font-bold text-stone-900 font-mono">{selectedFile.name}</h3>
                            <p className="text-[10px] text-stone-500 font-mono">Size: {selectedFile.size} | Status: Decrypted</p>
                          </div>
                          
                          <button
                            onClick={() => {
                              const blob = new Blob([selectedFile.content], { type: "text/plain" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = selectedFile.name;
                              a.click();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-[#fffdfb] hover:bg-orange-50 border border-orange-200 rounded-lg text-[10px] font-bold text-orange-600 cursor-pointer shadow-sm transition-colors"
                          >
                            <Download className="w-3 h-3" /> Download Source
                          </button>
                        </div>

                        <div className="p-4 bg-[#fffdfb] border border-orange-100 rounded-xl font-mono text-[11px] leading-relaxed text-stone-700 max-h-[220px] overflow-y-auto whitespace-pre-wrap shadow-inner">
                          {selectedFile.content}
                        </div>

                        {selectedFile.sensitive && (
                          <div className="p-3 bg-orange-50/80 border border-orange-200/60 rounded-lg text-[11px] text-orange-800 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5 animate-bounce" />
                            <span>This asset was flagged with cryptographic trackers. Downloading or cloning this source code increments your security risk metrics instantly.</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center text-stone-500 space-y-2 py-16">
                        <Lock className="w-10 h-10 text-stone-300 mb-1" />
                        <h4 className="font-semibold text-stone-700">Classified Assets Decryption Node</h4>
                        <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                          Select any confidential blueprints from the server directory list to invoke secure authentication handshakes and display document streams.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* TAB 3: Credentials Registry & Custom Secrets Ingestion */}
            {activeTab === "secrets" && (
              <motion.div
                key="secrets"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-6 space-y-6 shadow-sm"
              >
                <div className="flex justify-between items-start border-b border-orange-100/60 pb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                      <Key className="w-5 h-5 text-orange-500" />
                      Encrypted Identity Credentials Registry
                    </h2>
                    <p className="text-xs text-stone-500 mt-1">
                      Manage environmental secrets keys, core database credentials, and production SSH access hashes. Revealing keys updates target threat scores.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Create Custom Secrets form */}
                  <div className="bg-[#fbf9f5] border border-orange-100/60 p-5 rounded-2xl space-y-4 shadow-inner">
                    <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider font-mono">
                      Ingest New Secret Config
                    </h3>

                    <form onSubmit={handleAddSecret} className="space-y-4 text-xs">
                      <div className="space-y-1">
                        <label className="text-stone-500 font-mono text-[10px]">ENVIRONMENTAL KEY NAME</label>
                        <input
                          type="text"
                          required
                          value={newSecretKey}
                          onChange={(e) => setNewSecretKey(e.target.value)}
                          placeholder="POSTGRES_DB_USER"
                          className="w-full bg-[#fffdfb] border border-orange-150 rounded-lg p-2.5 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-stone-500 font-mono text-[10px]">CONFIDENTIAL SECRET VALUE</label>
                        <input
                          type="text"
                          required
                          value={newSecretValue}
                          onChange={(e) => setNewSecretValue(e.target.value)}
                          placeholder="secret_postgres_pass"
                          className="w-full bg-[#fffdfb] border border-orange-150 rounded-lg p-2.5 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-stone-500 font-mono text-[10px]">RISK SENSITIVITY CLASSIFICATION</label>
                        <select
                          value={newSecretSensitive}
                          onChange={(e) => setNewSecretSensitive(e.target.value)}
                          className="w-full bg-[#fffdfb] border border-orange-150 rounded-lg p-2.5 text-stone-750 focus:outline-none"
                        >
                          <option value="Critical">Critical (e.g. production credentials)</option>
                          <option value="High">High (e.g. API Gateway secrets)</option>
                          <option value="Normal">Normal (e.g. logging formats)</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        Inscribe Custom Secret
                      </button>
                    </form>
                  </div>

                  {/* Config Secrets List Table */}
                  <div className="md:col-span-2 space-y-3.5">
                    <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider font-mono">
                      Credential Variable Parameters Table
                    </h3>

                    <div className="overflow-x-auto bg-[#fbf9f5] border border-orange-100/60 rounded-2xl shadow-inner">
                      <table className="w-full text-left text-xs divide-y divide-orange-100/40">
                        <thead>
                          <tr className="text-stone-500 font-mono text-[9px] uppercase tracking-wider bg-[#fbf9f5]">
                            <th className="p-3">Variable Key</th>
                            <th className="p-3">Sensitivity</th>
                            <th className="p-3 text-right">Encrypted Value Pane</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-100/40 bg-[#fffdfb]/40">
                          {secrets.map((sec) => (
                            <tr key={sec.id} className="hover:bg-orange-50/25 transition-colors">
                              <td className="p-3 font-mono font-bold text-stone-800">{sec.key}</td>
                              <td className="p-3">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                  sec.sensitive === "Critical" ? "bg-red-50 text-red-700 border border-red-100" : "bg-orange-50 text-orange-700 border border-orange-100"
                                }`}>
                                  {sec.sensitive}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleRevealSecret(sec.id)}
                                  className="px-2.5 py-1 bg-[#fffdfb] hover:bg-orange-50 border border-orange-150 hover:border-orange-200 text-[10px] font-mono font-semibold rounded-lg text-orange-600 cursor-pointer shadow-sm transition-colors"
                                >
                                  {sec.revealed ? sec.value : "••••••••••••••••••••• [Reveal]"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* TAB 4: SSH Shell terminal diagnostics */}
            {activeTab === "terminal" && (
              <motion.div
                key="terminal"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-6 space-y-4 shadow-sm"
              >
                <div>
                  <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                    <TerminalIcon className="w-5 h-5 text-orange-500" />
                    Administrative Diagnostics SSH Terminal
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Direct low-level command interpreter node. Supported commands: <code className="bg-[#fbf9f5] text-orange-600 px-1 py-0.5 border border-orange-100/60 rounded text-[10px]">help</code>, <code className="bg-[#fbf9f5] text-orange-600 px-1 py-0.5 border border-orange-100/60 rounded text-[10px]">ls</code>, <code className="bg-[#fbf9f5] text-orange-600 px-1 py-0.5 border border-orange-100/60 rounded text-[10px]">cat [file]</code>, <code className="bg-[#fbf9f5] text-orange-600 px-1 py-0.5 border border-orange-100/60 rounded text-[10px]">env</code>, <code className="bg-[#fbf9f5] text-orange-600 px-1 py-0.5 border border-orange-100/60 rounded text-[10px]">secrets</code>, <code className="bg-[#fbf9f5] text-orange-600 px-1 py-0.5 border border-orange-100/60 rounded text-[10px]">netstat</code>, <code className="bg-[#fbf9f5] text-orange-600 px-1 py-0.5 border border-orange-100/60 rounded text-[10px]">ifconfig</code>.
                  </p>
                </div>

                {/* The Black Box Screen */}
                <div className="bg-[#1a1715] border border-orange-100/40 rounded-2xl p-4 font-mono text-[11px] h-[320px] flex flex-col justify-between overflow-hidden shadow-inner">
                  
                  {/* Command Output timelines */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-text">
                    {cmdHistory.map((item, idx) => (
                      <div key={idx}>
                        {item.type === "cmd" ? (
                          <div className="flex items-center gap-1 text-stone-500">
                            <span className="text-orange-500 font-bold">root@deception-core:~#</span>
                            <span className="text-[#f4efe8] font-semibold">{item.text}</span>
                          </div>
                        ) : item.type === "error" ? (
                          <div className="text-red-400 font-semibold leading-relaxed whitespace-pre-wrap">{item.text}</div>
                        ) : (
                          <div className="text-[#d8cebf] leading-relaxed whitespace-pre-wrap">{item.text}</div>
                        )}
                      </div>
                    ))}
                    <div ref={termEndRef} />
                  </div>

                  {/* Input form bar */}
                  <form onSubmit={handleTerminalSubmit} className="flex items-center gap-1.5 border-t border-stone-800 pt-3 mt-2">
                    <span className="text-orange-500 font-bold">root@deception-core:~#</span>
                    <input
                      type="text"
                      value={currentCmd}
                      onChange={(e) => setCurrentCmd(e.target.value)}
                      placeholder="Enter command (e.g. 'help', 'ls', 'env')..."
                      className="flex-1 bg-transparent border-none text-[#f4efe8] focus:outline-none focus:ring-0 placeholder-stone-700 font-mono text-[11px] p-0"
                    />
                    <button type="submit" className="p-1 text-[#d8cebf] hover:text-orange-400 transition-colors cursor-pointer">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB 5: Global Sandbox queries */}
            {activeTab === "search" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[#fffdfb] border border-orange-100 rounded-2xl p-6 space-y-6 shadow-sm"
              >
                <div>
                  <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                    <Search className="w-5 h-5 text-orange-500" />
                    Global System Resource Search Indexer
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Execute cross-compilation query indexes to find target sensitive secrets, corporate plans, or files hidden in the system filesystem database.
                  </p>
                </div>

                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for 'blueprint', 'password', 'key', 'ssn', 'ledger'..."
                      className="w-full pl-10 pr-3 py-2.5 bg-[#fbf9f5] border border-orange-150 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-orange-500 hover:bg-orange-600 text-white font-black px-4 py-2.5 rounded-xl text-xs cursor-pointer shadow-sm transition-colors"
                  >
                    Query Index
                  </button>
                </form>

                {searching ? (
                  <div className="py-12 flex flex-col items-center justify-center text-xs text-stone-500 gap-2 font-mono">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>Scanning index arrays...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    <h3 className="text-xs font-bold text-stone-700 font-mono uppercase tracking-wider">
                      Query Matches found ({searchResults.length})
                    </h3>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {searchResults.map((item, idx) => (
                        <div key={idx} className="p-3 bg-[#fbf9f5] border border-orange-100/60 rounded-xl flex items-center justify-between gap-3 hover:border-orange-250 transition-all shadow-sm">
                          <div>
                            <span className="text-[9px] font-mono bg-orange-50 text-orange-700 border border-orange-100 px-1.5 py-0.5 rounded font-bold uppercase">
                              {item.type}
                            </span>
                            <p className="text-xs font-bold text-stone-900 mt-1.5">{item.name}</p>
                            <p className="text-[10px] text-stone-500 font-mono mt-0.5">{item.desc}</p>
                          </div>
                          
                          <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : searchQuery ? (
                  <div className="py-12 text-center text-stone-500 text-xs font-mono">
                    No directory records found matching search constraints.
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-stone-500 text-center gap-2">
                    <Database className="w-10 h-10 text-stone-300" />
                    <span className="text-xs max-w-xs leading-relaxed">Submit index query searches above to locate matching structural credentials or files inside the corporate registry.</span>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
