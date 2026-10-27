import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Shield, 
  Users, 
  Cpu, 
  Database, 
  HardDrive, 
  Activity, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

export const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [usersData, logsData, healthData, sysData] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminAuditLogs(),
        api.getHealth(),
        api.getAdminSystemHealth()
      ]);
      setUsers(usersData || []);
      setAuditLogs(logsData || []);
      setHealth(healthData);
      setSystemHealth(sysData);
    } catch (err) {
      setError(err.message || 'Failed to load administrator data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.updateRole(userId, newRole);
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      alert(`Role update failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">System Health & Governance</h1>
          <p className="text-xs text-slate-500">
            Hardware acceleration, PyTorch runtime, role permissions, and HIPAA/GDPR audit trails.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'overview' ? 'bg-purple-100 text-purple-800' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          System Health
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'users' ? 'bg-purple-100 text-purple-800' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Users & Roles ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl transition-colors ${
            activeTab === 'audit' ? 'bg-purple-100 text-purple-800' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: System Health Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* PyTorch Hardware */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-purple-600" />
                Inference Hardware
              </span>
              <div className="text-sm font-extrabold text-slate-900 truncate">
                {health?.hardware_acceleration || 'MPS Accelerated'}
              </div>
              <span className="text-[11px] text-teal-600 block">PyTorch {health?.pytorch_version}</span>
            </div>

            {/* Model Weights */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                Model Weights Status
              </span>
              <div className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                {health?.model_weights_ready ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Ready (Installed)
                  </span>
                ) : (
                  <span className="text-amber-600">Demo Active</span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 block">Fusion Architecture</span>
            </div>

            {/* Stored Audio Recordings */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-blue-600" />
                Audio Storage Consumed
              </span>
              <div className="text-2xl font-extrabold text-slate-900">
                {systemHealth?.storage_used_mb || 0} MB
              </div>
              <span className="text-[11px] text-slate-500 block">
                {systemHealth?.stored_audio_files || 0} audio recordings on disk
              </span>
            </div>

            {/* Database Records */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <Database className="w-4 h-4 text-slate-700" />
                Database Records
              </span>
              <div className="text-2xl font-extrabold text-slate-900">
                {systemHealth?.total_assessments || 0} Assessments
              </div>
              <span className="text-[11px] text-slate-500 block">
                {systemHealth?.total_users || 0} registered user profiles
              </span>
            </div>

          </div>

          {/* Model Weights Path Information */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Neural Weights & Inference Pipeline Configuration
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-xs text-slate-700 space-y-2">
              <div><strong>Checkpoint File:</strong> backend/weights/speechcare_fusion_model.pt</div>
              <div><strong>Decision Threshold:</strong> Confidence &ge; 60.0% (Abstains on &lt; 60%)</div>
              <div><strong>Screening Classes:</strong> Control, Dysarthria, Stuttering, Aphasia</div>
              <div><strong>Severity Scale:</strong> Continuous 0 to 100 with 4 standardized bands</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Users & Role Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 pb-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              User Accounts & Role Permissions
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Modify Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-slate-500">#{u.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{u.full_name}</td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] capitalize ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'clinician' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs text-slate-800 outline-none"
                      >
                        <option value="patient">Patient</option>
                        <option value="clinician">Clinician</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Compliance Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 pb-4 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Security & Access Audit Trail (HIPAA/GDPR Compliance)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable logging of all authentication events, assessments, report downloads, and deletions.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {log.user_email || `User #${log.user_id || 'Anon'}`}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {log.resource_type} #{log.resource_id || ''}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'SUCCESS' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
