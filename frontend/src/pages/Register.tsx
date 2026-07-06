import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function Register() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/register', {
        username,
        password,
        full_name: fullName,
      });
      toast.success('Pendaftaran berhasil, silakan login');
      navigate('/login');
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 relative overflow-hidden">
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="diamond" width="40" height="40" patternUnits="userSpaceOnUse">
            <polygon points="20,0 40,20 20,40 0,20" fill="none" stroke="#3B82F6" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diamond)" />
      </svg>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="font-poppins font-bold text-2xl text-primary">Baitul Maal</h1>
          <p className="text-muted text-sm mt-1">Daftar Akun Jamaah</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-10"
                  maxLength={50}
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  placeholder="Nama Lengkap"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field pl-10"
                  maxLength={100}
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  placeholder="Konfirmasi Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-10"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <UserPlus size={18} />
                  Daftar
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted mt-4">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-accent hover:underline font-medium">
              Masuk di sini
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted mt-8">
          &copy; 2026 Baitul Maal Management System. Terkelola dengan Amanah.
        </p>
      </div>
    </div>
  );
}
