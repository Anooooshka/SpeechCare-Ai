import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, User, Shield, Stethoscope, LogOut, LogIn, ChevronDown, CheckCircle2 } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, quickDemoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleSwitch = async (role) => {
    try {
      await quickDemoLogin(role);
      if (role === 'patient') navigate('/dashboard/patient');
      else if (role === 'clinician') navigate('/dashboard/clinician');
      else if (role === 'admin') navigate('/dashboard/admin');
    } catch (err) {
      console.error('Role switch failed:', err);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Clinical Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">SpeechCare</span>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">AI</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight hidden sm:block">Clinical Screening & Monitoring</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') ? 'text-teal-700 bg-teal-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Home
            </Link>

            <Link
              to="/assessment"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/assessment') ? 'text-teal-700 bg-teal-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Start Screening
            </Link>

            {user && (
              <Link
                to="/dashboard/patient"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/dashboard/patient') ? 'text-teal-700 bg-teal-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Patient Dashboard
              </Link>
            )}

            {user && (user.role === 'clinician' || user.role === 'admin') && (
              <Link
                to="/dashboard/clinician"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/dashboard/clinician') ? 'text-teal-700 bg-teal-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Clinician Portal
              </Link>
            )}

            {user && user.role === 'admin' && (
              <Link
                to="/dashboard/admin"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/dashboard/admin') ? 'text-teal-700 bg-teal-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Admin
              </Link>
            )}
          </nav>

          {/* Quick Demo Role Switcher & Auth */}
          <div className="flex items-center gap-3">
            {/* Quick Demo Switcher */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
              <span className="text-slate-400 font-medium px-2">Demo Role:</span>
              <button
                onClick={() => handleRoleSwitch('patient')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  user?.role === 'patient' ? 'bg-white text-teal-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Patient Persona"
              >
                Patient
              </button>
              <button
                onClick={() => handleRoleSwitch('clinician')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  user?.role === 'clinician' ? 'bg-white text-teal-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Clinician Persona"
              >
                Clinician
              </button>
              <button
                onClick={() => handleRoleSwitch('admin')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  user?.role === 'admin' ? 'bg-white text-teal-700 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Switch to Admin Persona"
              >
                Admin
              </button>
            </div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">{user.full_name}</div>
                  <span className={`inline-block text-[10px] px-2 py-0.2 rounded-full font-medium capitalize ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'clinician' ? 'bg-blue-100 text-blue-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
