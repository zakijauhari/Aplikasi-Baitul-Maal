import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, History, FileText, Tv, Settings, LogOut, Menu, X, Bell, Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import clsx from 'clsx';

const menuItems = [
  { path: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard, roles: ['admin', 'viewer'] },
  { path: '/transaksi/baru', label: 'Input Transaksi', icon: ArrowLeftRight, roles: ['admin'] },
  { path: '/riwayat', label: 'Riwayat Keuangan', icon: History, roles: ['admin', 'viewer'] },
  { path: '/laporan', label: 'Laporan', icon: FileText, roles: ['admin', 'viewer'] },
  { path: '/tv', label: 'Layar TV', icon: Tv, roles: ['admin', 'viewer'] },
  { path: '/pengaturan', label: 'Pengaturan', icon: Settings, roles: ['admin'] },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/riwayat?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const filteredMenu = menuItems.filter((item) => item.roles.includes(user?.role || 'viewer'));

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden">
        <aside
          className={clsx(
            'fixed inset-y-0 left-0 z-50 w-64 bg-surface shadow-lg transform transition-transform duration-300 lg:relative lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-100">
              <h1 className="font-poppins font-bold text-xl text-primary">Baitul Maal</h1>
              <p className="text-sm text-muted mt-1">
                {user?.role === 'admin' ? 'Bendahara' : 'Jamaah'}
              </p>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {filteredMenu.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-green-50 text-primary border-l-4 border-primary'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-danger hover:bg-red-50 transition-colors"
              >
                <LogOut size={20} />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-surface border-b border-gray-100 px-6 py-3 flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </form>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/laporan')}
                className="hidden sm:inline-flex btn-outline text-sm"
              >
                Unduh Laporan
              </button>
              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell size={20} className="text-muted" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                  {user?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-800">{user?.full_name}</p>
                  <p className="text-xs text-muted">{user?.role === 'admin' ? 'Bendahara' : 'Jamaah'}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
