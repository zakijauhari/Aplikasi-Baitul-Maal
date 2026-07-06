import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Plus, Eye, Tv, Building2 } from 'lucide-react';
import api, { formatRupiah, formatDateShort } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { DashboardData } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ data: DashboardData }>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/dashboard/summary').then((r) => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const dashboard = data?.data;
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Total Saldo Card */}
      <div className="card bg-gradient-to-br from-primary to-primary-dark text-white p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-white/80 text-sm">Total Saldo Terkonsolidasi</p>
            <h2 className="font-jetbrains text-4xl font-semibold mt-2">
              {formatRupiah(dashboard?.total_saldo || 0)}
            </h2>
            {dashboard?.perubahan_persen_bulan_ini !== null && dashboard?.perubahan_persen_bulan_ini !== undefined ? (
              <div className="flex items-center gap-1 mt-2 text-sm">
                {dashboard.perubahan_persen_bulan_ini >= 0 ? (
                  <ArrowUpRight size={16} className="text-green-300" />
                ) : (
                  <ArrowDownRight size={16} className="text-red-300" />
                )}
                <span className={dashboard.perubahan_persen_bulan_ini >= 0 ? 'text-green-300' : 'text-red-300'}>
                  {dashboard.perubahan_persen_bulan_ini >= 0 ? '+' : ''}{dashboard.perubahan_persen_bulan_ini}% bln ini
                </span>
              </div>
            ) : (
              <p className="text-white/60 text-sm mt-2">-</p>
            )}
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <button
                onClick={() => navigate('/transaksi/baru')}
                className="bg-accent text-white px-5 py-2.5 rounded-lg font-medium hover:bg-amber-600 transition-colors flex items-center gap-2 text-sm"
              >
                <Plus size={18} />
                Input Transaksi Baru
              </button>
            )}
            <button
              onClick={() => navigate('/riwayat')}
              className="bg-white/20 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-white/30 transition-colors flex items-center gap-2 text-sm"
            >
              <Eye size={18} />
              Lihat Rincian
            </button>
          </div>
        </div>
      </div>

      {/* Quick Shortcuts */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/transaksi/baru?kategori=infaq')}
            className="card text-left hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-primary">Kotak Jumat</h3>
            <p className="text-sm text-muted mt-1">Input pemasukan Infaq</p>
          </button>
          <button
            onClick={() => navigate('/transaksi/baru?kategori=operasional')}
            className="card text-left hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-primary">Bayar Operasional</h3>
            <p className="text-sm text-muted mt-1">Listrik, Air, & Kebersihan</p>
          </button>
        </div>
      )}

      {/* Alokasi Dana */}
      <div className="card">
        <h3 className="font-poppins font-semibold text-lg text-primary mb-4">Alokasi Dana</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {dashboard?.kategori?.slice(0, 4).map((kat) => {
            const pct = dashboard.total_saldo > 0
              ? Math.round((kat.saldo / dashboard.total_saldo) * 100)
              : 0;
            return (
              <div key={kat.id} className="p-4 bg-background rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 size={18} className="text-primary" />
                  <p className="font-medium text-sm">{kat.nama}</p>
                </div>
                <p className="font-jetbrains font-semibold text-lg">{formatRupiah(kat.saldo)}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {dashboard?.kategori && dashboard.kategori.length > 4 && (
          <button
            onClick={() => navigate('/pengaturan')}
            className="text-accent text-sm mt-3 hover:underline"
          >
            Lihat Semua Kategori
          </button>
        )}
      </div>

      {/* Transaksi Terakhir */}
      <div className="card">
        <h3 className="font-poppins font-semibold text-lg text-primary mb-4">Transaksi Terakhir</h3>
        {dashboard?.transaksi_terakhir && dashboard.transaksi_terakhir.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-gray-100">
                  <th className="pb-3 font-medium">Tanggal</th>
                  <th className="pb-3 font-medium">Deskripsi</th>
                  <th className="pb-3 font-medium">Kategori</th>
                  <th className="pb-3 font-medium">Jumlah</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.transaksi_terakhir.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3">{formatDateShort(t.tanggal)}</td>
                    <td className="py-3">{t.deskripsi || '-'}</td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-green-50 text-primary text-xs rounded-full font-medium">
                        {t.kategori}
                      </span>
                    </td>
                    <td className={`py-3 font-jetbrains font-medium ${t.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}`}>
                      {t.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(t.nominal)}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-green-50 text-success text-xs rounded-full">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p>Belum ada transaksi tercatat</p>
          </div>
        )}
      </div>

      {/* TV Widget */}
      <button
        onClick={() => navigate('/tv')}
        className="card flex items-center gap-4 hover:shadow-lg transition-shadow w-full text-left"
      >
        <Building2 size={32} className="text-primary" />
        <div>
          <p className="font-medium text-primary">Masjid Al-Istiqomah</p>
          <p className="text-sm text-muted">Pelaporan Transparansi & Amanah</p>
        </div>
        <Tv size={24} className="ml-auto text-accent" />
      </button>
    </div>
  );
}
