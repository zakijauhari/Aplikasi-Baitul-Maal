import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, ArrowLeft, KeyRound, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function LupaPassword() {
  const [step, setStep] = useState<'username' | 'reset'>('username');
  const [username, setUsername] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/api/auth/forgot-password', { username });
      const code = res.data.data.reset_code;
      setGeneratedCode(code);
      toast.success('Kode reset berhasil dibuat');
      setStep('reset');
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message || 'Terjadi kesalahan';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/auth/reset-password', {
        username,
        reset_code: resetCode,
        new_password: newPassword,
      });
      toast.success('Password berhasil diubah');
      navigate('/login');
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message || 'Terjadi kesalahan';
      setError(msg);
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
          <h1 className="font-poppins font-bold text-2xl text-primary">Atur Ulang Password</h1>
          <p className="text-muted text-sm mt-1">
            {step === 'username'
              ? 'Masukkan username untuk mendapatkan kode reset'
              : 'Masukkan kode reset dan password baru'}
          </p>
        </div>

        <div className="card">
          {step === 'username' ? (
            <form onSubmit={handleRequestCode} className="space-y-5">
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

              {error && (
                <p className="text-danger text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <KeyRound size={18} />
                    Dapatkan Kode Reset
                  </>
                )}
              </button>

              <p className="text-center text-sm text-muted mt-2">
                <Link to="/login" className="text-accent hover:underline inline-flex items-center gap-1">
                  <ArrowLeft size={14} />
                  Kembali ke Login
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-700 font-medium">
                  Kode reset untuk <span className="font-bold">{username}</span>
                </p>

                <p className="text-4xl font-bold tracking-[0.4em] text-blue-900 mt-3">
                  {generatedCode}
                </p>

                <p className="text-xs text-blue-500 mt-3">
                  Tulis kode di atas, lalu masukkan ke kolom <b>Kode Reset</b> di bawah.
                  <br />
                  Kode berlaku selama <b>15 menit</b>.
                </p>
              </div>
              <div>
                <label className="text-sm text-muted block mb-1">Kode Reset</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Masukkan 6 digit kode"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input-field text-center text-lg tracking-widest font-mono"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted block mb-1">Password Baru</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field pr-10"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-600"
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted block mb-1">Konfirmasi Password Baru</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <p className="text-danger text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <RefreshCw size={18} />
                    Ubah Password
                  </>
                )}
              </button>

              <p className="text-center text-sm text-muted mt-2">
                <Link to="/login" className="text-accent hover:underline inline-flex items-center gap-1">
                  <ArrowLeft size={14} />
                  Kembali ke Login
                </Link>
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-8">
          &copy; 2026 Baitul Maal Management System
        </p>
      </div>
    </div>
  );
}
