import React, { useState } from "react";
import { Shield, KeyRound, User, AlertCircle, RefreshCw, Eye, EyeOff, ShieldCheck, Laptop, Smartphone } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onLoginSuccess: (session: any, role: "admin" | "user") => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [loginRole, setLoginRole] = useState<"user" | "admin">("user");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError(`Please enter your ${loginRole === "admin" ? "Admin Username" : "Email Address"}.`);
      return;
    }

    setLoading(true);
    setError(null);

    const endpoint = loginRole === "admin" ? "/api/auth/admin-login" : "/api/auth/login";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Credential verification failed. Please check your credentials.");
      } else if (data.status === "success") {
        if (data.token) {
          localStorage.setItem("jwt_token", data.token);
        }
        const assignedRole = loginRole === "admin" || data.role === "admin" ? "admin" : "user";
        onLoginSuccess(data.session, assignedRole);
      } else {
        setError("Invalid gateway response. Please try again.");
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setError("Gateway authentication request timed out (8s). Please retry or verify server connectivity.");
      } else {
        setError("Server connection error. Please verify the backend service is reachable.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 py-8 text-slate-800" id="login-container">
      
      <div className="w-full max-w-4xl space-y-6 z-10">
        
        {/* ROLE SELECTION TABS */}
        <div className="flex justify-center">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex gap-2 w-full max-w-md shadow-sm">
            <button
              type="button"
              onClick={() => { setLoginRole("user"); setError(null); setUsername(""); setPassword(""); }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                loginRole === "user"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Employee Login</span>
            </button>

            <button
              type="button"
              onClick={() => { setLoginRole("admin"); setError(null); setUsername(""); setPassword(""); }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                loginRole === "admin"
                  ? "bg-slate-900 text-amber-400 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Admin Login</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center" id="login-layout-grid">
          
          {/* LEFT COLUMN: Portal Information */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-black shadow-sm ${
                loginRole === "admin" ? "bg-slate-900 text-amber-400" : "bg-blue-600 text-white"
              }`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase">
                  Sai Vidya Institute of Technology
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {loginRole === "admin" ? "Admin Security Portal" : "Campus Employee Portal"}
                </h2>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {loginRole === "admin" ? (
                <>Sign in to the <strong>Admin Dashboard</strong> to monitor active sessions, check threat logs, and manage user access from your phone or laptop.</>
              ) : (
                <>Welcome! Log in with your registered email and password to access the <strong>Employee Portal</strong> and your department services.</>
              )}
            </p>

            <div className="border-t border-slate-100 pt-4 space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>System Status: <strong>All Good</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Adaptive Auth: <strong>Enabled</strong></span>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: Real Login Credentials Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm"
          >
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className={`w-5 h-5 ${loginRole === "admin" ? "text-amber-500" : "text-blue-600"}`} />
                {loginRole === "admin" ? "Admin Sign In" : "Sign In"}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {loginRole === "admin" ? "Use your admin email (e.g. admin@svit.edu)" : "Enter your college email and password"}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs flex items-start gap-2 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  {loginRole === "admin" ? "Admin Username" : "Email Address"}
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={loginRole === "admin" ? "admin@svit.edu" : "employee@svit.edu"}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className={`w-full py-3 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50 ${
                  loginRole === "admin"
                    ? "bg-slate-900 hover:bg-slate-800 text-amber-400"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    {loginRole === "admin" ? "Sign In" : "Sign In"}
                  </>
                )}
              </button>
            </form>
          </motion.div>

        </div>

      </div>
    </div>
  );
}
