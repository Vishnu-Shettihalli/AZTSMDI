import React, { useState, useEffect } from "react";
import { ShieldCheck, LogOut, Smartphone, Laptop, Radio, Activity } from "lucide-react";
import Login from "./components/Login";
import RealDashboard from "./components/RealDashboard";
import DeceptionDashboard from "./components/DeceptionDashboard";
import AdminDashboard from "./components/AdminDashboard";
import CyberRadarBackground from "./components/CyberRadarBackground";

export default function App() {
  const [userRole, setUserRole] = useState<"admin" | "user" | null>(null);
  const [session, setSession] = useState<any>(null);

  // Restore & validate session from server on load
  useEffect(() => {
    const savedSession = localStorage.getItem("active_security_session");
    const savedRole = localStorage.getItem("active_security_role") as "admin" | "user" | null;

    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed?.id) {
          fetch(`/api/session/${parsed.id}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.status === "success" && data.session) {
                setSession(data.session);
                setUserRole(savedRole || (data.session.role === "ADMIN" ? "admin" : "user"));
                localStorage.setItem("active_security_session", JSON.stringify(data.session));
              } else if (savedRole === "admin") {
                setSession(parsed);
                setUserRole("admin");
              } else {
                setSession(null);
                setUserRole(null);
                localStorage.removeItem("active_security_session");
                localStorage.removeItem("active_security_role");
              }
            })
            .catch(() => {
              setSession(parsed);
              setUserRole(savedRole || (parsed.role === "admin" ? "admin" : "user"));
            });
        }
      } catch (e) {
        localStorage.removeItem("active_security_session");
        localStorage.removeItem("active_security_role");
      }
    }
  }, []);

  const handleLoginSuccess = (newSession: any, role: "admin" | "user") => {
    setSession(newSession);
    setUserRole(role);
    localStorage.setItem("active_security_session", JSON.stringify(newSession));
    localStorage.setItem("active_security_role", role);
  };

  const handleLogout = async () => {
    if (session) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.id })
        });
      } catch (e) {
        console.warn("Logout request failed", e);
      }
    }
    setSession(null);
    setUserRole(null);
    localStorage.removeItem("active_security_session");
    localStorage.removeItem("active_security_role");
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] flex flex-col justify-between text-slate-800 antialiased font-sans relative overflow-x-hidden" id="app-root">
      
      {/* Animated Cyber Radar & Background */}
      <CyberRadarBackground />

      {/* HEADER BAR (Role Specific & Mobile Responsive) */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 text-slate-800 shadow-sm sticky top-0 z-50 py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-row justify-between items-center gap-2">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 rounded-xl flex items-center justify-center text-white shadow-md font-extrabold text-xs tracking-tight border border-blue-400/30 shrink-0">
              ZT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5">
                  ShadowGate Portal
                </h1>
                <span className="hidden sm:inline-flex text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-mono font-bold tracking-wider uppercase items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  Active
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-sans flex items-center gap-1.5">
                {userRole === "admin" ? (
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-amber-600" />
                    SOC Admin Threat Intelligence Center
                  </span>
                ) : userRole === "user" ? (
                  <span className="text-blue-700 font-medium flex items-center gap-1">
                    <Laptop className="w-3 h-3 text-blue-600" />
                    Employee Internal Access Gateway
                  </span>
                ) : (
                  <span>Zero-Trust Deception Security Gateway</span>
                )}
              </p>
            </div>
          </div>

          {/* User Status / Logout Action */}
          {userRole && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:flex flex-col items-end text-xs">
                <span className="font-bold text-slate-900 font-mono">
                  {userRole === "admin" ? (session?.username || "SOC Security Admin") : (session?.username || "Employee Account")}
                </span>
                <span className="text-[10px] text-slate-500">
                  Role: <strong className={userRole === "admin" ? "text-amber-600" : "text-blue-600"}>{userRole.toUpperCase()}</strong>
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="py-2 px-3 sm:px-4 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-200 hover:border-red-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}

        </div>
      </header>

      {/* Main Sandbox Area */}
      <main className="flex-1 min-h-[80vh] relative z-10 p-2 sm:p-4">
        {userRole === null ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : userRole === "admin" ? (
          <div className="min-h-[85vh] max-w-7xl mx-auto">
            <AdminDashboard />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {session?.status === "Deception" || session?.type === "Deception" ? (
              <DeceptionDashboard session={session} onLogout={handleLogout} />
            ) : (
              <RealDashboard session={session} onLogout={handleLogout} />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-slate-200 py-4 px-4 text-center text-slate-500 text-xs relative z-10">
        <div className="max-w-4xl mx-auto space-y-1">
          <p className="font-bold text-slate-700 uppercase tracking-widest text-[10px] font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Zero-Trust Adaptive Deception Infrastructure • SVIT Major Project
          </p>
        </div>
      </footer>

    </div>
  );
}
