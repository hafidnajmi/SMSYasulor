"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isUserAdmin, getDefaultDashboardRoute } from '@/utils/auth';
import { API_BASE } from '@/utils/api';

// Official Bootstrap Icons (SVG 16x16)
const BsKeyFill = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path d="M3.5 11.5a3.5 3.5 0 1 1 3.163-5H14L15.5 8 14 9.5l-1-1-1 1-1-1-1 1-1.337 0a3.5 3.5 0 0 1-4.163 2zM3 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
  </svg>
);

const BsLightningChargeFill = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path d="M11.251.068a.5.5 0 0 1 .454.579L10.5 5.5h3a.5.5 0 0 1 .374.832l-7 8a.5.5 0 0 1-.842-.518l1.205-4.814h-3a.5.5 0 0 1-.374-.832l7-8a.5.5 0 0 1 .388-.17z"/>
  </svg>
);

const BsEye = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
  </svg>
);

const BsEyeSlash = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
    <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
    <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
  </svg>
);

const BsShieldLockFill = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M8 0c-.69 0-1.843.265-2.928.56-1.11.3-2.229.655-2.887.87a1.54 1.54 0 0 0-1.044 1.262c-.596 4.477.787 7.795 2.465 9.99a11.777 11.777 0 0 0 2.517 2.453c.386.273.744.482 1.048.625.28.132.581.24.829.24s.548-.108.829-.24a7.159 7.159 0 0 0 1.048-.625 11.775 11.775 0 0 0 2.517-2.453c1.678-2.195 3.061-5.513 2.465-9.99a1.541 1.541 0 0 0-1.044-1.263 62.467 62.467 0 0 0-2.887-.87C9.843.266 8.69 0 8 0zm0 5a1.5 1.5 0 0 1 .5 2.915l.385 1.99a.5.5 0 0 1-.491.595h-.788a.5.5 0 0 1-.49-.595l.384-1.99A1.5 1.5 0 0 1 8 5z"/>
  </svg>
);

const BsCheckCircleFill = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
  </svg>
);

const BsCircle = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
  </svg>
);

const BsExclamationTriangleFill = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
  </svg>
);

const BsPersonBadge = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path d="M6.5 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
    <path d="M4.5 0A2.5 2.5 0 0 0 2 2.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2.5A2.5 2.5 0 0 0 11.5 0h-7zM3 2.5A1.5 1.5 0 0 1 4.5 1h7A1.5 1.5 0 0 1 13 2.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.5z"/>
  </svg>
);

const BsArrowClockwise = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
  </svg>
);

export default function UserManagementPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | 'password'>('add');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordToggle, setShowPasswordToggle] = useState(false);
  const [showAddPasswordToggle, setShowAddPasswordToggle] = useState(false);

  // Helper Standar Keamanan Internasional (NIST SP 800-63B / OWASP)
  const checkPasswordCriteria = (pwd: string, username: string = '') => {
    const minLength = pwd.length >= 8 && pwd.length <= 64;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd);
    const notUsername = !username || !pwd.toLowerCase().includes(username.toLowerCase().trim());

    const passedCount = [minLength, hasUpper, hasLower, hasNumber, hasSymbol, notUsername].filter(Boolean).length;
    const isAllValid = minLength && hasUpper && hasLower && hasNumber && hasSymbol && notUsername;

    let strengthLabel = 'Sangat Lemah';
    let strengthColor = 'bg-red-500';
    let strengthWidth = 'w-1/6';

    if (passedCount >= 6) {
      strengthLabel = 'Sangat Kuat (Standar Internasional)';
      strengthColor = 'bg-emerald-500';
      strengthWidth = 'w-full';
    } else if (passedCount >= 5) {
      strengthLabel = 'Kuat';
      strengthColor = 'bg-green-500';
      strengthWidth = 'w-4/5';
    } else if (passedCount >= 4) {
      strengthLabel = 'Sedang';
      strengthColor = 'bg-yellow-500';
      strengthWidth = 'w-3/5';
    } else if (passedCount >= 2) {
      strengthLabel = 'Lemah';
      strengthColor = 'bg-orange-500';
      strengthWidth = 'w-2/5';
    }

    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSymbol,
      notUsername,
      isAllValid,
      strengthLabel,
      strengthColor,
      strengthWidth
    };
  };

  const generateStrongPassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%^&*_-+=";
    let pwd = "";
    for (let i = 0; i < 3; i++) pwd += upper[Math.floor(Math.random() * upper.length)];
    for (let i = 0; i < 4; i++) pwd += lower[Math.floor(Math.random() * lower.length)];
    for (let i = 0; i < 3; i++) pwd += numbers[Math.floor(Math.random() * numbers.length)];
    for (let i = 0; i < 2; i++) pwd += symbols[Math.floor(Math.random() * symbols.length)];
    return pwd.split('').sort(() => 0.5 - Math.random()).join('');
  };
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationMsg, setValidationMsg] = useState('');
  const [authModal, setAuthModal] = useState({
    isOpen: false,
    action: '',
    user: null as any,
    reason: ''
  });
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    nik: '',
    role: 'USER',
    isActive: 1,
    launchCo: 0,
    up: 0,
    pole: 0,
    mscAdm: 0,
    iq: 0,
    upFillingSpv: 0,
    upFillingManager: 0,
    packagingPole: 0,
    qaLab: 0,
    lihatIm: 0,
    historiPengisian: 0,
    settings: 0,
    inputSpecCode: 0,
    specCodePdf: 0
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    let u: any = null;
    try {
      const uStr = localStorage.getItem("im_user");
      if (uStr) u = JSON.parse(uStr);
    } catch (e) { }

    if (!u || !isUserAdmin(u)) {
      setIsAuthorized(false);
      const targetRoute = getDefaultDashboardRoute(u);
      router.replace(targetRoute);
      return;
    }

    setIsAuthorized(true);
    fetchUsers();
  }, [router]);

  const handleSaveUser = async () => {
    try {
      const url = modalMode === 'add' ? `${API_BASE}/api/users` : `${API_BASE}/api/users/${selectedUser.id}`;
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      
      const payload = { ...formData };
      
      if (modalMode === 'add') {
        const criteria = checkPasswordCriteria(payload.password || '', payload.username || '');
        if (!criteria.isAllValid) {
          setValidationMsg('Password belum memenuhi standar keamanan internasional. Pastikan minimal 8 karakter dengan kombinasi huruf besar, huruf kecil, angka, dan simbol.');
          return;
        }
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowModal(false);
        fetchUsers();
      } else {
        const data = await res.json().catch(() => null);
        setValidationMsg(data?.message || 'Gagal menyimpan user');
      }
    } catch (e) {
      console.error(e);
      setValidationMsg('Terjadi kesalahan saat menyimpan user');
    }
  };

  const handleView = (u: any) => {
    setModalMode('view');
    setSelectedUser(u);
    setShowModal(true);
  };

  const handleEdit = (u: any) => {
    setModalMode('edit');
    setSelectedUser(u);
    setFormData({
      username: u.username || '',
      password: '', // don't load password hash
      fullName: u.fullName || '',
      nik: u.nik || '',
      role: u.role || 'USER',
      isActive: u.isActive,
      launchCo: u.launchCo,
      up: u.up,
      pole: u.pole,
      mscAdm: u.mscAdm,
      iq: u.iq,
      upFillingSpv: u.upFillingSpv,
      upFillingManager: u.upFillingManager,
      packagingPole: u.packagingPole,
      qaLab: u.qaLab,
      lihatIm: u.lihatIm,
      historiPengisian: u.historiPengisian,
      settings: u.settings,
      inputSpecCode: u.inputSpecCode || u.input_spec_code || 0,
      specCodePdf: u.specCodePdf || u.spec_code_pdf || 0
    });
    setShowModal(true);
  };

  const handleChangePassword = (u: any) => {
    setSelectedUser(u);
    setNewPassword('');
    setConfirmPassword('');
    setModalMode('password');
    setShowModal(true);
  };
  
  const handleActionConfirm = async () => {
    if (!authModal.reason) {
      setValidationMsg("Alasan tindakan tidak boleh kosong.");
      return;
    }

    try {
      if (authModal.action === 'Deactivate' || authModal.action === 'Activate') {
        const payload = {
          ...authModal.user,
          isActive: authModal.action === 'Deactivate' ? 0 : 1
        };
        const res = await fetch(`${API_BASE}/api/users/${authModal.user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setAuthModal({ ...authModal, isOpen: false });
          fetchUsers();
        } else {
          setValidationMsg(`Gagal memproses ${authModal.action}`);
        }
      } else if (authModal.action === 'Unlock') {
        // Unlock logic if needed, but for now just close and refresh
        setAuthModal({ ...authModal, isOpen: false });
      }
    } catch (e) {
      console.error(e);
      setValidationMsg("Terjadi kesalahan saat memproses tindakan");
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setValidationMsg("Kata sandi tidak boleh kosong.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setValidationMsg("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    
    const criteria = checkPasswordCriteria(newPassword, selectedUser?.username || '');
    if (!criteria.isAllValid) {
      setValidationMsg("Kata sandi belum memenuhi standar keamanan internasional. Pastikan minimal 8 karakter dan memiliki huruf besar, kecil, angka, serta simbol.");
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/api/users/${selectedUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPassword, modifiedBy: 'admin' })
      });
      if (res.ok) {
        setShowModal(false);
        fetchUsers();
      } else {
        const data = await res.json().catch(() => null);
        setValidationMsg(data?.message || "Gagal mengubah kata sandi");
      }
    } catch(e) {
      console.error(e);
      setValidationMsg("Terjadi kesalahan saat mengubah kata sandi");
    }
  };
  
  const toggleCheckbox = (field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev] === 1 ? 0 : 1
    }));
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) || 
    u.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  if (isAuthorized !== true) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white h-full font-sans">
        <div className="w-8 h-8 border-4 border-[#0078D4] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-[13px] text-[#605E5C]">Memeriksa hak akses...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      
      {/* Header Banner */}
      <div className="bg-[#005A9E] px-[30px] pt-[18px] pb-[14px] shrink-0 flex items-center justify-between">
        <h1 className="text-[15px] font-bold text-white flex items-center space-x-2 tracking-wide uppercase">
          <span>USER MANAGEMENT</span>
          <span className="text-white/60 mx-1">·</span>
          <span className="font-normal text-white/90 capitalize">Kelola Pengguna & Hak Akses</span>
        </h1>
        <div className="flex gap-2">
          <button onClick={() => {
            setModalMode('add');
            setSelectedUser(null);
            setFormData({
              username: '', password: '', fullName: '', nik: '', role: 'USER', isActive: 1,
              launchCo: 0, up: 0, pole: 0, mscAdm: 0, iq: 0, upFillingSpv: 0, upFillingManager: 0,
              packagingPole: 0, qaLab: 0, lihatIm: 0, historiPengisian: 0, settings: 0, inputSpecCode: 0, specCodePdf: 0
            });
            setShowModal(true);
          }} className="bg-white hover:bg-[#F3F4F6] text-[#005A9E] px-3.5 py-1.5 rounded-none text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer border border-white">
            + Add User
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 px-[30px] pt-4 pb-0 overflow-hidden">
        {/* Filter and Search Bar */}
      <div className="flex flex-col gap-2 mb-2 shrink-0">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[300px]">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4 text-[#A19F9D] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              autoComplete="off"
              name="search_users_query_random"
              placeholder="Search username, name, department, role..." 
              className="border border-gray-300 rounded-none p-2 pl-9 w-full text-[12px] focus:outline-none focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <select className="border border-gray-300 rounded-none p-2 text-[12px] bg-gray-50 text-gray-700 min-w-[120px] focus:outline-none">
              <option>All Status</option>
            </select>
            <select className="border border-gray-300 rounded-none p-2 text-[12px] bg-gray-50 text-gray-700 min-w-[140px] focus:outline-none">
              <option>All Departments</option>
            </select>
            <select className="border border-gray-300 rounded-none p-2 text-[12px] bg-gray-50 text-gray-700 min-w-[120px] focus:outline-none">
              <option>All Roles</option>
            </select>
            <select className="border border-gray-300 rounded-none p-2 text-[12px] bg-gray-50 text-gray-700 min-w-[140px] focus:outline-none">
              <option>Sort by Username</option>
            </select>
            <button onClick={fetchUsers} className="border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2 rounded-none text-[12px] font-semibold flex items-center gap-2 transition-colors cursor-pointer text-gray-700 shadow-none">
              <BsArrowClockwise className="w-3.5 h-3.5 text-gray-600" /> Refresh
            </button>
          </div>
        </div>
        
        <div className="text-[11px] text-gray-500 tracking-wide mt-1">
          Total: {users.length} accounts • Active: {users.filter(u => u.isActive === 1).length} • Locked: {users.filter(u => u.isLocked === 1).length} • Disabled: {users.filter(u => u.isActive === 0).length}
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto border border-[#CBD5E1] rounded-none shadow-none mt-4 min-h-0 bg-white">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="sticky top-0 bg-[#F8FAFC] z-10 border-b border-[#CBD5E1] shadow-none">
            <tr className="bg-[#F8FAFC] text-gray-500 whitespace-nowrap">
              <th className="p-3 font-semibold uppercase tracking-wider whitespace-nowrap">NO</th>
              <th className="p-3 font-semibold uppercase tracking-wider whitespace-nowrap">USERNAME</th>
              <th className="p-3 font-semibold uppercase tracking-wider whitespace-nowrap">FULL NAME</th>
              <th className="p-3 font-semibold uppercase tracking-wider whitespace-nowrap">PASSWORD</th>
              <th className="p-3 font-semibold uppercase tracking-wider whitespace-nowrap">DEPARTMENT</th>
              <th className="p-3 font-semibold uppercase tracking-wider text-center whitespace-nowrap">ROLE</th>
              <th className="p-3 font-semibold uppercase tracking-wider text-center whitespace-nowrap">STATUS</th>
              <th className="p-3 font-semibold uppercase tracking-wider text-center whitespace-nowrap">FAILED LOGIN</th>
              <th className="p-3 font-semibold uppercase tracking-wider whitespace-nowrap">LAST LOGIN</th>
              <th className="p-3 font-semibold uppercase tracking-wider whitespace-nowrap">LOCKED UNTIL</th>
              <th className="p-3 font-semibold uppercase tracking-wider text-center whitespace-nowrap min-w-[340px]">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="p-8 text-center text-gray-500 text-sm">Loading users...</td></tr>
            ) : filteredUsers.map((u, i) => (
              <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="p-3 text-gray-600 align-top">{i + 1}</td>
                <td className="p-3 font-bold text-gray-800 align-top">{u.username}</td>
                <td className="p-3 text-gray-700 align-top">{u.fullName}</td>
                <td className="p-3 align-top max-w-[170px] whitespace-nowrap">
                  <div className="flex items-center space-x-1.5 text-[11px]">
                    <svg className="w-3.5 h-3.5 text-[#16A34A] shrink-0" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>
                    </svg>
                    <span className="font-mono tracking-widest text-[#475569] font-bold">••••••••</span>
                    <span className="text-[9.5px] bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1] px-1.5 py-0.5 rounded-none font-semibold">
                      SHA-256
                    </span>
                  </div>
                </td>
                <td className="p-3 text-gray-600 align-top max-w-[180px] break-words uppercase">
                  {u.departmentText}
                </td>
                <td className="p-3 align-top text-center whitespace-nowrap">
                  <span className={`inline-block px-2 py-0.5 rounded-none text-[10px] font-extrabold tracking-wide border ${u.role === 'ADMIN' ? 'bg-[#334155] text-white border-[#1E293B]' : 'bg-[#64748B] text-white border-[#475569]'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3 align-top text-center whitespace-nowrap">
                  <span className={`inline-block px-2 py-0.5 rounded-none text-[10px] font-extrabold tracking-wide border ${u.isActive === 1 ? 'bg-[#00FF00] text-[#000000] border-[#00CC00]' : 'bg-[#DC2626] text-white border-[#B91C1C]'}`}>
                    {u.isActive === 1 ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td className="p-3 text-center text-gray-600 align-top whitespace-nowrap">{u.failedLoginCount}</td>
                <td className="p-3 text-gray-600 align-top whitespace-nowrap">
                  {u.lastLogin ? u.lastLogin.replace('T', ' ').substring(0, 19) : ''}
                </td>
                <td className="p-3 text-gray-600 align-top whitespace-nowrap">
                  {u.lockedUntil ? u.lockedUntil.replace('T', ' ').substring(0, 19) : ''}
                </td>
                <td className="p-2.5 align-middle whitespace-nowrap min-w-[340px]">
                  {u.username === 'admin' ? (
                    <div className="flex items-center gap-1.5 flex-nowrap justify-center">
                      <span className="text-gray-400 italic text-[11px] mr-1">System Account</span>
                      <button
                        type="button"
                        onClick={() => handleChangePassword(u)}
                        className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[11px] font-semibold px-2.5 py-1 rounded-none shadow-none cursor-pointer transition-colors"
                      >
                        Change Password
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 flex-nowrap justify-center">
                      <button
                        type="button"
                        onClick={() => handleView(u)}
                        className="bg-[#475569] hover:bg-[#334155] text-white text-[11px] font-semibold px-2 py-1 rounded-none shadow-none cursor-pointer transition-colors"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEdit(u)}
                        className="bg-[#0078D4] hover:bg-[#005A9E] text-white text-[11px] font-semibold px-2 py-1 rounded-none shadow-none cursor-pointer transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthModal({ isOpen: true, action: 'Unlock', user: u, reason: '' })}
                        className={`text-[11px] font-semibold px-2 py-1 rounded-none shadow-none transition-colors ${
                          u.isLocked === 1
                            ? 'bg-[#D97706] hover:bg-[#B45309] text-white cursor-pointer'
                            : 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
                        }`}
                        disabled={u.isLocked !== 1}
                      >
                        Unlock
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangePassword(u)}
                        className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[11px] font-semibold px-2 py-1 rounded-none shadow-none cursor-pointer transition-colors"
                      >
                        Change Password
                      </button>
                      {u.isActive === 1 ? (
                        <button
                          type="button"
                          onClick={() => setAuthModal({ isOpen: true, action: 'Deactivate', user: u, reason: '' })}
                          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-semibold px-2 py-1 rounded-none shadow-none cursor-pointer transition-colors"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAuthModal({ isOpen: true, action: 'Activate', user: u, reason: '' })}
                          className="bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-semibold px-2 py-1 rounded-none shadow-none cursor-pointer transition-colors"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      </div>

      {/* Footer bar */}
      <div className="bg-[#F9FAFB] border-t border-[#E5E7EB] py-1.5 px-6 mt-auto text-[10px] text-[#9CA3AF] flex justify-between shrink-0 font-sans">
        <span>{filteredUsers.length} user accounts</span>
        <span>IM DIGITAL VERSI 1.8</span>
      </div>
      
      {/* Modals */}
      {showModal && modalMode === 'view' && selectedUser && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-none shadow-2xl w-[500px] flex flex-col border border-gray-300">
            <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50 rounded-none">
              <div className="flex items-center gap-2">
                <BsPersonBadge className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[12px] text-gray-700">User Detail : {selectedUser.username}</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-lg leading-none">&times;</button>
            </div>
            <div className="p-6">
              <h2 className="text-lg text-gray-800 mb-6">User Account Details</h2>
              <div className="grid grid-cols-[150px_1fr] gap-y-3 text-[12px]">
                <div className="text-gray-600">Username :</div>
                <div className="text-gray-800">{selectedUser.username}</div>
                
                <div className="text-gray-600">Employee Name :</div>
                <div className="text-gray-800">{selectedUser.fullName || '-'}</div>
                
                <div className="text-gray-600">Employee ID (NIK) :</div>
                <div className="text-gray-800">{selectedUser.nik || '-'}</div>
                
                <div className="text-gray-600">Status Password :</div>
                <div className="text-gray-800 flex items-center space-x-2">
                  <span className="font-mono tracking-widest text-[#475569] font-bold">••••••••••••</span>
                  <span className="text-[10px] bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] px-2 py-0.5 rounded-none font-semibold flex items-center gap-1">
                    <svg className="w-3 h-3 text-[#10B981]" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                    </svg>
                    Terenkripsi Standar Internasional (SHA-256)
                  </span>
                </div>
                
                <div className="text-gray-600">Department :</div>
                <div className="text-gray-800 uppercase">{selectedUser.departmentText || '-'}</div>
                
                <div className="text-gray-600">Role :</div>
                <div className="text-gray-800">{selectedUser.role}</div>
                
                <div className="text-gray-600">Email :</div>
                <div className="text-gray-800">{selectedUser.email || '-'}</div>
                
                <div className="text-gray-600">Created Date :</div>
                <div className="text-gray-800">{selectedUser.createdAt ? selectedUser.createdAt.replace('T', ' ').substring(0, 19) : '-'}</div>
                
                <div className="text-gray-600">Created By :</div>
                <div className="text-gray-800">{selectedUser.createdBy || '-'}</div>
                
                <div className="text-gray-600">Last Login :</div>
                <div className="text-gray-800">{selectedUser.lastLogin ? selectedUser.lastLogin.replace('T', ' ').substring(0, 19) : '-'}</div>
                
                <div className="text-gray-600">Last Failed Login :</div>
                <div className="text-gray-800">{selectedUser.lastFailedLogin ? selectedUser.lastFailedLogin.replace('T', ' ').substring(0, 19) : '-'}</div>
                
                <div className="text-gray-600">Failed Login Count :</div>
                <div className="text-gray-800">{selectedUser.failedLoginCount}</div>
                
                <div className="text-gray-600">Locked Until :</div>
                <div className="text-gray-800">{selectedUser.lockedUntil ? selectedUser.lockedUntil.replace('T', ' ').substring(0, 19) : '-'}</div>
                
                <div className="text-gray-600">Status :</div>
                <div className="text-gray-800">{selectedUser.isActive === 1 ? 'Active' : 'Inactive'}</div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end bg-gray-50 rounded-none mt-2">
              <button onClick={() => setShowModal(false)} className="px-5 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-none text-[12px] hover:bg-gray-100 transition-colors shadow-none">Close</button>
            </div>
          </div>
        </div>
      )}

      {showModal && modalMode === 'password' && selectedUser && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-none shadow-2xl w-[400px] flex flex-col border border-gray-300">
            <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50 rounded-none">
              <div className="flex items-center gap-2">
                <BsKeyFill className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[12px] text-gray-700">Change Password : {selectedUser.username}</span>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 text-lg leading-none">&times;</button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h2 className="text-base text-[#0F172A] font-bold">Ubah Kata Sandi : {selectedUser.username}</h2>
                <button
                  type="button"
                  onClick={() => {
                    const generated = generateStrongPassword();
                    setNewPassword(generated);
                    setConfirmPassword(generated);
                  }}
                  className="text-[11px] font-semibold text-[#0078D4] hover:text-[#005A9E] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <BsLightningChargeFill className="w-3 h-3 text-[#0078D4]" />
                  <span>Buat Password Kuat</span>
                </button>
              </div>

              {(() => {
                const criteria = checkPasswordCriteria(newPassword, selectedUser.username);
                return (
                  <>
                    <div className="mb-3.5">
                      <label className="block text-[12px] font-semibold text-gray-700 mb-1">Password Baru *</label>
                      <div className="relative flex items-center">
                        <input 
                          type={showPasswordToggle ? "text" : "password"}
                          autoComplete="new-password"
                          className="border border-gray-300 rounded-none w-full p-2 pr-9 text-xs focus:outline-none focus:border-[#0078D4]"
                          placeholder="Masukkan password baru..."
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordToggle(!showPasswordToggle)}
                          className="absolute right-2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer flex items-center justify-center"
                          title={showPasswordToggle ? "Sembunyikan" : "Tampilkan"}
                        >
                          {showPasswordToggle ? (
                            <BsEyeSlash className="w-4 h-4 text-gray-500" />
                          ) : (
                            <BsEye className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>

                      {/* Password Strength Meter */}
                      {newPassword.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10.5px] font-semibold mb-1">
                            <span className="text-gray-600">Kekuatan Sandi:</span>
                            <span className="text-gray-800">{criteria.strengthLabel}</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-none overflow-hidden">
                            <div className={`h-full transition-all duration-300 ${criteria.strengthColor} ${criteria.strengthWidth}`}></div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-3.5">
                      <label className="block text-[12px] font-semibold text-gray-700 mb-1">Ulangi Password Baru *</label>
                      <div className="relative flex items-center">
                        <input 
                          type={showPasswordToggle ? "text" : "password"}
                          autoComplete="new-password"
                          className={`border rounded-none w-full p-2 pr-9 text-xs focus:outline-none ${
                            confirmPassword && confirmPassword !== newPassword
                              ? 'border-red-400 focus:border-red-500 bg-red-50/20'
                              : 'border-gray-300 focus:border-[#0078D4]'
                          }`}
                          placeholder="Ulangi password baru..."
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordToggle(!showPasswordToggle)}
                          className="absolute right-2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer flex items-center justify-center"
                          title={showPasswordToggle ? "Sembunyikan" : "Tampilkan"}
                        >
                          {showPasswordToggle ? (
                            <BsEyeSlash className="w-4 h-4 text-gray-500" />
                          ) : (
                            <BsEye className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                      {confirmPassword && confirmPassword !== newPassword && (
                        <div className="flex items-center gap-1.5 text-[10.5px] text-red-600 mt-1 font-medium">
                          <BsExclamationTriangleFill className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>Konfirmasi password tidak cocok</span>
                        </div>
                      )}
                    </div>

                    {/* International Security Standard Checklist (NIST & OWASP) */}
                    <div className="bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-none mb-5">
                      <div className="text-[11px] font-bold text-[#1E293B] mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                        <BsShieldLockFill className="w-3.5 h-3.5 text-[#0078D4] shrink-0" />
                        <span>Kriteria Standar Keamanan Internasional (NIST/OWASP) :</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10.5px]">
                        <div className={`flex items-center gap-1.5 ${criteria.minLength ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                          {criteria.minLength ? <BsCheckCircleFill className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <BsCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                          <span>Minimal 8 karakter</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${criteria.hasUpper ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                          {criteria.hasUpper ? <BsCheckCircleFill className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <BsCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                          <span>Huruf besar (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${criteria.hasLower ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                          {criteria.hasLower ? <BsCheckCircleFill className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <BsCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                          <span>Huruf kecil (a-z)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${criteria.hasNumber ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                          {criteria.hasNumber ? <BsCheckCircleFill className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <BsCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                          <span>Angka (0-9)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${criteria.hasSymbol ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                          {criteria.hasSymbol ? <BsCheckCircleFill className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <BsCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                          <span>Simbol khusus (!@#$...)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${criteria.notUsername ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                          {criteria.notUsername ? <BsCheckCircleFill className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <BsCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                          <span>Bukan nama username</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button 
                        type="button"
                        onClick={() => setShowModal(false)} 
                        className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded-none text-[12px] hover:bg-gray-50 transition-colors shadow-none cursor-pointer"
                      >
                        Batal
                      </button>
                      <button 
                        type="button"
                        onClick={handleSavePassword} 
                        disabled={!criteria.isAllValid || newPassword !== confirmPassword}
                        className="px-5 py-1.5 bg-[#005A9E] hover:bg-[#004A80] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-none text-[12px] font-semibold transition-colors shadow-none cursor-pointer"
                      >
                        Simpan Password
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showModal && (modalMode === 'add' || modalMode === 'edit') && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-none shadow-2xl w-[600px] max-h-[90vh] overflow-y-auto border border-gray-300">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">{modalMode === 'add' ? 'Add User' : 'Edit User'}</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4 text-[12px]">
              <div>
                <label className="block font-semibold mb-1 text-gray-700">Username</label>
                <input type="text" className="border border-gray-300 rounded w-full p-2 focus:outline-blue-500" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} disabled={modalMode === 'edit' && selectedUser?.username === 'admin'} />
              </div>
              {modalMode === 'add' && (
                <div className="col-span-2 bg-[#F8FAFC] border border-[#CBD5E1] p-3 rounded-none">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-[11.5px] text-gray-700 uppercase">
                      Password (Standar Keamanan Internasional) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateStrongPassword();
                        setFormData({ ...formData, password: generated });
                      }}
                      className="text-[10.5px] font-semibold text-[#0078D4] hover:text-[#005A9E] hover:underline flex items-center gap-1.5 cursor-pointer"
                    >
                      <BsLightningChargeFill className="w-3 h-3 text-[#0078D4]" />
                      <span>Buat Password Kuat</span>
                    </button>
                  </div>
                  <div className="relative flex items-center mb-2">
                    <input 
                      type={showAddPasswordToggle ? "text" : "password"} 
                      name="add_user_password" 
                      autoComplete="new-password" 
                      placeholder="Masukkan password kuat..." 
                      className="border border-gray-300 rounded-none w-full p-2 pr-9 text-xs focus:outline-none focus:border-[#0078D4] bg-white" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPasswordToggle(!showAddPasswordToggle)}
                      className="absolute right-2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer flex items-center justify-center"
                      title={showAddPasswordToggle ? "Sembunyikan" : "Tampilkan"}
                    >
                      {showAddPasswordToggle ? (
                        <BsEyeSlash className="w-4 h-4 text-gray-500" />
                      ) : (
                        <BsEye className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>

                  {(() => {
                    const criteria = checkPasswordCriteria(formData.password || '', formData.username || '');
                    return (
                      <div>
                        {formData.password && formData.password.length > 0 && (
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-[10px] font-semibold mb-1">
                              <span className="text-gray-500">Kekuatan Password:</span>
                              <span className="text-gray-800">{criteria.strengthLabel}</span>
                            </div>
                            <div className="w-full bg-gray-200 h-1 rounded-none overflow-hidden">
                              <div className={`h-full transition-all duration-300 ${criteria.strengthColor} ${criteria.strengthWidth}`}></div>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 text-[10px]">
                          <span className={`flex items-center gap-1 ${criteria.minLength ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                            {criteria.minLength ? <BsCheckCircleFill className="w-3 h-3 text-emerald-600 shrink-0" /> : <BsCircle className="w-3 h-3 text-gray-400 shrink-0" />}
                            <span>Min 8 karakter</span>
                          </span>
                          <span className={`flex items-center gap-1 ${criteria.hasUpper ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                            {criteria.hasUpper ? <BsCheckCircleFill className="w-3 h-3 text-emerald-600 shrink-0" /> : <BsCircle className="w-3 h-3 text-gray-400 shrink-0" />}
                            <span>Huruf besar (A-Z)</span>
                          </span>
                          <span className={`flex items-center gap-1 ${criteria.hasLower ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                            {criteria.hasLower ? <BsCheckCircleFill className="w-3 h-3 text-emerald-600 shrink-0" /> : <BsCircle className="w-3 h-3 text-gray-400 shrink-0" />}
                            <span>Huruf kecil (a-z)</span>
                          </span>
                          <span className={`flex items-center gap-1 ${criteria.hasNumber ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                            {criteria.hasNumber ? <BsCheckCircleFill className="w-3 h-3 text-emerald-600 shrink-0" /> : <BsCircle className="w-3 h-3 text-gray-400 shrink-0" />}
                            <span>Angka (0-9)</span>
                          </span>
                          <span className={`flex items-center gap-1 ${criteria.hasSymbol ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                            {criteria.hasSymbol ? <BsCheckCircleFill className="w-3 h-3 text-emerald-600 shrink-0" /> : <BsCircle className="w-3 h-3 text-gray-400 shrink-0" />}
                            <span>Simbol (!@#$...)</span>
                          </span>
                          <span className={`flex items-center gap-1 ${criteria.notUsername ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                            {criteria.notUsername ? <BsCheckCircleFill className="w-3 h-3 text-emerald-600 shrink-0" /> : <BsCircle className="w-3 h-3 text-gray-400 shrink-0" />}
                            <span>Bukan username</span>
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              <div>
                <label className="block font-semibold mb-1 text-gray-700">Full Name</label>
                <input type="text" className="border border-gray-300 rounded w-full p-2 focus:outline-blue-500" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700">NIK</label>
                <input type="text" className="border border-gray-300 rounded w-full p-2 focus:outline-blue-500" value={formData.nik} onChange={e => setFormData({...formData, nik: e.target.value})} />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700">Role</label>
                <select className="border border-gray-300 rounded w-full p-2 focus:outline-blue-500" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-700">Status</label>
                <select className="border border-gray-300 rounded w-full p-2 focus:outline-blue-500" value={formData.isActive} onChange={e => setFormData({...formData, isActive: Number(e.target.value)})}>
                  <option value={1}>ACTIVE</option>
                  <option value={0}>INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-bold border-b pb-2 mb-3 text-[13px] text-gray-800">Divisions Access</h3>
              <div className="grid grid-cols-2 gap-3 text-[12px] text-gray-700">
                {[
                  { key: 'launchCo', label: 'LAUNCH CO' },
                  { key: 'up', label: 'UP' },
                  { key: 'pole', label: 'POLE' },
                  { key: 'mscAdm', label: 'MSC ADM' },
                  { key: 'iq', label: 'IQ' },
                  { key: 'upFillingSpv', label: 'UP FILLING SPV' },
                  { key: 'upFillingManager', label: 'UP FILLING MANAGER' },
                  { key: 'packagingPole', label: 'PACKAGING & POLE' },
                  { key: 'qaLab', label: 'QA LAB (HEAD LAB)' },
                  { key: 'lihatIm', label: 'LIHAT IM' },
                  { key: 'historiPengisian', label: 'HISTORI PENGISIAN' },
                  { key: 'settings', label: 'SETTINGS' },
                  { key: 'inputSpecCode', label: 'INPUT SPEC CODE' },
                  { key: 'specCodePdf', label: 'SPEC CODE & PDF' }
                ].map(f => (
                  <label key={f.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" checked={formData[f.key as keyof typeof formData] === 1} onChange={() => toggleCheckbox(f.key)} />
                    <span className="font-medium">{f.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-none text-sm hover:bg-gray-50 transition-colors font-medium cursor-pointer">Cancel</button>
              <button onClick={handleSaveUser} className="px-5 py-2 bg-[#005A9E] hover:bg-[#004A80] text-white rounded-none text-sm font-semibold transition-colors shadow-none cursor-pointer">Save Changes</button>
            </div>
          </div>
        </div>
      )}
      {/* Validation Modal */}
      {validationMsg && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-none shadow-2xl w-[320px] flex flex-col font-sans border border-gray-300">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white rounded-t-md">
              <div className="flex items-center space-x-2">
                <div className="w-[14px] h-[14px] bg-gradient-to-br from-blue-300 to-blue-500 rounded-sm"></div>
                <span className="text-[12px] text-gray-800">Validation</span>
              </div>
              <button onClick={() => setValidationMsg('')} className="text-gray-500 hover:text-red-500 hover:bg-gray-100 w-6 h-6 flex items-center justify-center rounded transition-colors text-lg leading-none">
                &times;
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5 flex items-start space-x-4">
              <BsExclamationTriangleFill className="w-8 h-8 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-[13px] text-gray-800 pt-1 leading-relaxed">
                {validationMsg}
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50/50 p-3 flex justify-end rounded-b-md">
              <button 
                onClick={() => setValidationMsg('')}
                className="px-5 py-1 text-[13px] text-gray-800 bg-white border border-[#0067B8] hover:bg-blue-50 focus:bg-blue-50 rounded-[4px] transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Authorization Modal */}
      {authModal.isOpen && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-[70]">
          <div className="bg-white rounded-none shadow-2xl w-[400px] flex flex-col font-sans border border-gray-300">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white rounded-t-md">
              <div className="flex items-center space-x-2">
                <div className="w-[14px] h-[14px] bg-gradient-to-br from-blue-300 to-blue-500 rounded-sm"></div>
                <span className="text-[12px] text-gray-800">Otorisasi Tindakan</span>
              </div>
              <button onClick={() => setAuthModal({ ...authModal, isOpen: false })} className="text-gray-500 hover:text-red-500 hover:bg-gray-100 w-6 h-6 flex items-center justify-center rounded transition-colors text-lg leading-none">
                &times;
              </button>
            </div>
            
            {/* Body */}
            <div className="p-5">
              <h2 className="text-[15px] font-semibold text-gray-800 mb-4">
                Konfirmasi {authModal.action === 'Deactivate' ? 'Nonaktifkan' : authModal.action === 'Activate' ? 'Aktifkan' : 'Buka Kunci'} Akun
              </h2>
              <p className="text-[13px] text-gray-700 mb-4">
                Apakah Anda yakin ingin melakukan tindakan ini untuk user <strong className="font-bold">{authModal.user?.username}</strong>?
              </p>
              
              <div className="mb-2">
                <label className="block text-[13px] text-gray-800 mb-1">Alasan tindakan *</label>
                <input 
                  type="text" 
                  autoComplete="off"
                  placeholder="Masukkan alasan untuk audit log..."
                  className="w-full border border-gray-300 rounded p-2 text-[13px] focus:outline-none focus:border-[#0067B8]"
                  value={authModal.reason}
                  onChange={(e) => setAuthModal({ ...authModal, reason: e.target.value })}
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50/50 p-3 flex justify-end space-x-2 rounded-b-md">
              <button 
                onClick={() => setAuthModal({ ...authModal, isOpen: false })}
                className="px-4 py-1.5 text-[13px] text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 focus:bg-gray-50 rounded-[4px] transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleActionConfirm}
                className="px-4 py-1.5 text-[13px] text-white bg-[#0067B8] border border-[#0067B8] hover:bg-[#005A9E] focus:bg-[#005A9E] rounded-[4px] transition-colors"
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
