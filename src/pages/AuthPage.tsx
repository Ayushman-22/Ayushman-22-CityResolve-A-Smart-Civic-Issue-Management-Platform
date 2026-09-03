import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Mail, Lock, ArrowRight, ArrowLeft, AlertCircle, Users, ShieldCheck, BarChart3, Chrome } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ROLE_ROUTES } from "@/lib/constants";
import type { Role } from "@/types";

const ROLE_INFO: Record<Role, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  citizen: { label: "Citizen", icon: <Users className="w-5 h-5" />, color: "bg-teal-500", description: "Report and track civic issues" },
  officer: { label: "Officer", icon: <ShieldCheck className="w-5 h-5" />, color: "bg-blue-500", description: "Resolve assigned issues in your ward" },
  admin: { label: "Administrator", icon: <BarChart3 className="w-5 h-5" />, color: "bg-indigo-500", description: "Manage issues, assignments, and analytics" },
};

export default function AuthPage({ mode }: { mode: "signin" | "signup" }) {
  const { role: roleParam } = useParams<{ role: string }>();
  const [role, setRole] = useState<Role>((["citizen", "officer", "admin"].includes(roleParam || "") ? roleParam : "citizen") as Role);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [ward, setWard] = useState("");
  const [error, setError] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMismatch(false);
    setLoading(true);

    if (mode === "signin") {
      const { error: err, mismatch: mm } = await signIn(email, password, role);
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }
      if (mm) {
        setMismatch(true);
        setLoading(false);
        return;
      }
      toast("Welcome back!", "success");
      navigate(ROLE_ROUTES[role]);
    } else {
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        setLoading(false);
        return;
      }
      const { error: err } = await signUp(email, password, fullName, role, ward);
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }
      toast("Account created successfully!", "success");
      navigate(ROLE_ROUTES[role]);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    const { error: err } = await signInWithGoogle();
    if (err) {
      setError(err);
      setLoading(false);
    }
  };

  const otherMode = mode === "signin" ? "signup" : "signin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home */}
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-6">
            <img src="/city-logo.png" alt="CityResolve" className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-teal-600/20" />
            <span className="text-xl font-bold text-slate-900">CityResolve</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "signin" ? "Sign in to your role workspace" : "Choose your role to get started"}
          </p>

          {/* Role selector */}
          <div className="mt-6 grid grid-cols-3 gap-2">
            {(["citizen", "officer", "admin"] as Role[]).map((r) => {
              const info = ROLE_INFO[r];
              const active = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRole(r); navigate(`/auth/${mode}/${r}`, { replace: true }); }}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${
                    active
                      ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? info.color : "bg-slate-100"} text-white transition-colors`}>
                    <span className={active ? "" : "text-slate-500"}>{info.icon}</span>
                  </div>
                  <span className={`text-xs font-semibold ${active ? "text-teal-700" : "text-slate-600"}`}>{info.label}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-center text-xs text-slate-500">{ROLE_INFO[role].description}</p>

          {mode === "signin" && (
            <>
              <div className="mt-6 flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                <span>OR</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
              >
                <Chrome className="h-4 w-4" />
                Continue with Google
              </button>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  placeholder="Jane Doe"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  placeholder={mode === "signup" ? "Min. 6 characters" : "••••••••"}
                />
              </div>
            </div>

            {mode === "signup" && (role === "officer" || role === "admin") && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ward / Area (optional)</label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  placeholder="e.g. Ward 7, Downtown"
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {mismatch && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  This account doesn't belong to the <strong>{ROLE_INFO[role].label}</strong> role. Please sign in with the correct role for this account.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-all disabled:opacity-50"
            >
              {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <Link to={`/auth/${otherMode}/${role}`} className="font-semibold text-teal-600 hover:text-teal-700">
              {mode === "signin" ? "Sign up" : "Sign in"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
