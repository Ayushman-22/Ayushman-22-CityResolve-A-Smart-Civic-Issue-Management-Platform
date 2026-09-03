import { Link } from "react-router-dom";
import { MapPin, Zap, ShieldCheck, Users, ArrowRight, CheckCircle2, BarChart3, Camera } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/city-logo.png"
                alt="CityResolve"
                className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-teal-600/20"
              />
              <span className="text-xl font-bold text-white">CityResolve</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/signin/citizen"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white/90 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup/citizen"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm hover:bg-teal-50 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.pexels.com/photos/3794750/pexels-photo-3794750.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
            alt="City skyline"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-teal-900/70" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-32 pb-24 lg:pt-40 lg:pb-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200 backdrop-blur-sm ring-1 ring-white/20">
              <Zap className="w-3.5 h-3.5" />
              AI-Powered Civic Issue Resolution
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Report. Track. Resolve.
              <span className="block text-teal-300">Your city, improved together.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-200 leading-relaxed">
              CityResolve connects citizens, officers, and administrators to fix urban issues
              faster. AI suggests categories and priorities from your description, so nothing
              falls through the cracks.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/signup/citizen"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/30 hover:bg-teal-400 transition-all"
              >
                Report an Issue
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/signin/citizen"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3.5 text-base font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm hover:bg-white/20 transition-all"
              >
                Sign In
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-400" /> Free for citizens</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-400" /> Real-time tracking</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-400" /> AI-assisted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Role cards */}
      <section className="py-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">Three roles, one platform</h2>
            <p className="mt-3 text-slate-600">Choose your role and get a workspace tailored to what you need to do.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <RoleCard
              icon={<Users className="w-7 h-7" />}
              color="bg-teal-500"
              title="Citizen"
              description="Report issues with photos and location. Track progress from Pending to Resolved in real time."
              features={["Photo + location reporting", "AI category suggestions", "Live status tracking"]}
              link="/signup/citizen"
            />
            <RoleCard
              icon={<ShieldCheck className="w-7 h-7" />}
              color="bg-blue-500"
              title="Officer"
              description="Get assigned issues in your ward. Update status and add resolution notes as you work."
              features={["Ward-based assignments", "Status workflow tools", "Resolution notes"]}
              link="/signup/officer"
            />
            <RoleCard
              icon={<BarChart3 className="w-7 h-7" />}
              color="bg-indigo-500"
              title="Administrator"
              description="Assign issues, set priorities, and view analytics on trends, resolution times, and officer performance."
              features={["Issue assignment", "Interactive map view", "Analytics dashboard"]}
              link="/signup/admin"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
            <p className="mt-3 text-slate-600">From report to resolution in four simple steps.</p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            <StepCard step="01" icon={<Camera className="w-6 h-6" />} title="Report" description="Citizen submits an issue with a description, photo, and location." />
            <StepCard step="02" icon={<Zap className="w-6 h-6" />} title="AI Suggests" description="AI analyzes the description to suggest category and priority automatically." />
            <StepCard step="03" icon={<ShieldCheck className="w-6 h-6" />} title="Assign" description="Admin assigns the issue to an officer in the relevant ward." />
            <StepCard step="04" icon={<CheckCircle2 className="w-6 h-6" />} title="Resolve" description="Officer updates status through to Resolved. Citizen gets notified." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-teal-600 to-teal-700">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to improve your city?</h2>
          <p className="mt-3 text-teal-100">Join CityResolve today and start making a difference in your community.</p>
          <Link
            to="/signup/citizen"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-teal-700 shadow-lg hover:bg-teal-50 transition-all"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <img src="/city-logo.png" alt="CityResolve" className="h-8 w-8 rounded-lg object-cover" />
              <span className="font-bold text-white">CityResolve</span>
            </div>
            <p className="text-sm text-slate-400">AI-Powered Civic Issue Resolution Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function RoleCard({ icon, color, title, description, features, link }: { icon: React.ReactNode; color: string; title: string; description: string; features: string[]; link: string }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5">
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${color} text-white shadow-lg`}>
        {icon}
      </div>
      <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
      <ul className="mt-4 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-teal-500" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        to={link}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
      >
        Get started <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function StepCard({ step, icon, title, description }: { step: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="relative">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
        {icon}
      </div>
      <div className="absolute top-0 right-0 text-3xl font-bold text-slate-100">{step}</div>
      <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
