import React from 'react';
import { Activity, ShieldCheck, HeartHandshake, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Medical Disclaimer Alert Banner */}
        <div className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-4 mb-10 flex items-start gap-3 text-slate-300">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-amber-300 block mb-0.5">Clinical Decision Support & Screening Disclaimer</span>
            SpeechCare AI is engineered as an assistive speech screening, acoustic biomarker analysis, and rehabilitation monitoring software system.
            It does NOT provide a formal medical diagnosis. All screening metrics, severity indices, and suggested exercises must be evaluated and confirmed by a certified Speech-Language Pathologist (CCC-SLP) or licensed medical clinician.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Column 1: Brand & Mission */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center text-white">
                <Activity className="w-4 h-4" />
              </div>
              <span>SpeechCare AI</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Advancing accessible speech and language disorder screening through acoustic biomarkers, deep representation learning, and clinician-in-the-loop decision support.
            </p>
          </div>

          {/* Column 2: Core Capabilities */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Core Modules</h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-teal-300 transition-colors">4-Class Disorder Screening</li>
              <li className="hover:text-teal-300 transition-colors">Continuous Severity Estimation (0-100)</li>
              <li className="hover:text-teal-300 transition-colors">Acoustic Biomarkers & Gender Detection</li>
              <li className="hover:text-teal-300 transition-colors">Spectral Speech Enhancement</li>
              <li className="hover:text-teal-300 transition-colors">Clinical PDF Report Generation</li>
            </ul>
          </div>

          {/* Column 3: Platform Portals */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Portals & Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/assessment" className="hover:text-teal-300 transition-colors">New Speech Assessment</Link></li>
              <li><Link to="/dashboard/patient" className="hover:text-teal-300 transition-colors">Patient Progress Dashboard</Link></li>
              <li><Link to="/dashboard/clinician" className="hover:text-teal-300 transition-colors">Clinician Review Portal</Link></li>
              <li><Link to="/dashboard/admin" className="hover:text-teal-300 transition-colors">System Admin & Audit Logs</Link></li>
            </ul>
          </div>

          {/* Column 4: Security & Compliance */}
          <div className="space-y-2 text-xs">
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Ethics & Privacy</h4>
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Explicit Patient Consent Required</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <HeartHandshake className="w-4 h-4 text-teal-400" />
              <span>Zero Unconsented Audio Retention</span>
            </div>
            <p className="text-[11px] text-slate-500 pt-2">
              Patients retain the fundamental right to permanently erase their audio recordings and biomarker history at any time.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} SpeechCare AI Research Platform. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 flex items-center gap-1">
            <span>Built with PyTorch, Librosa, and React.</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
