const API_BASE = '/api';

// Helper for authorized requests
export const getAuthHeaders = () => {
  const token = localStorage.getItem('speechcare_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const api = {
  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async register(payload) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Authentication expired');
    return data.user;
  },

  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Assessments
  async submitAssessment(formData) {
    const res = await fetch(`${API_BASE}/assessments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Audio analysis failed');
    return data;
  },

  async getAssessments(patientId = null) {
    const url = patientId ? `${API_BASE}/assessments?patient_id=${patientId}` : `${API_BASE}/assessments`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch assessments');
    return data.assessments;
  },

  async getAssessment(id) {
    const res = await fetch(`${API_BASE}/assessments/${id}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Assessment not found');
    return data.assessment;
  },

  async deleteAssessment(id) {
    const res = await fetch(`${API_BASE}/assessments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete assessment');
    return data;
  },

  async reviewAssessment(id, payload) {
    const res = await fetch(`${API_BASE}/assessments/${id}/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update review');
    return data;
  },

  // Audio Streaming URLs with token support
  getAudioUrl(id) {
    const token = localStorage.getItem('speechcare_token');
    return token ? `${API_BASE}/assessments/${id}/audio?token=${encodeURIComponent(token)}` : `${API_BASE}/assessments/${id}/audio`;
  },

  getEnhancedAudioUrl(id) {
    const token = localStorage.getItem('speechcare_token');
    return token ? `${API_BASE}/assessments/${id}/enhanced-audio?token=${encodeURIComponent(token)}` : `${API_BASE}/assessments/${id}/enhanced-audio`;
  },

  // PDF Report URL with token support
  getReportUrl(id) {
    const token = localStorage.getItem('speechcare_token');
    return token ? `${API_BASE}/assessments/${id}/report?token=${encodeURIComponent(token)}` : `${API_BASE}/assessments/${id}/report`;
  },

  async downloadReportBlob(id) {
    const res = await fetch(`${API_BASE}/assessments/${id}/report`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to download PDF clinical report");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SpeechCare_Clinical_Report_Assessment_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  },

  // Clinician & Progress
  async getClinicianPatients() {
    const res = await fetch(`${API_BASE}/clinician/patients`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch patients');
    return data.patients;
  },

  async getPatientProgress(patientId) {
    const res = await fetch(`${API_BASE}/patients/${patientId}/progress`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch progress');
    return data;
  },

  async getPatientProfile(patientId) {
    const res = await fetch(`${API_BASE}/patients/${patientId}/profile`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch patient profile');
    return data.profile;
  },

  async updatePatientProfile(patientId, profileData) {
    const res = await fetch(`${API_BASE}/patients/${patientId}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(profileData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update patient profile');
    return data.profile;
  },

  async getModelEvaluation() {
    const res = await fetch(`${API_BASE}/model/evaluation`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch model evaluation');
    return data;
  },

  // Admin
  async getAdminUsers() {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
    return data.users;
  },

  async updateRole(userId, role) {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update role');
    return data;
  },

  async getAdminAuditLogs() {
    const res = await fetch(`${API_BASE}/admin/audit-logs`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch audit logs');
    return data.audit_logs;
  },

  async getAdminSystemHealth() {
    const res = await fetch(`${API_BASE}/admin/system-health`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch health');
    return data;
  }
};
