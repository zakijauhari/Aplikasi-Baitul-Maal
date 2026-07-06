import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Tv, ShieldCheck, LogOut } from 'lucide-react';
import api, { formatRupiah, formatDateLong } from '../lib/api';
import { TvData } from '../types';

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <div className="font-jetbrains text-5xl font-semibold text-white">
        {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
      </div>
      <div className="text-white/70 text-lg mt-1">
        {formatDateLong(time.toISOString())}
      </div>
    </div>
  );
}

export default function ModeTV() {
  const navigate = useNavigate();
  const [showExit, setShowExit] = useState(false);

  const tvToken = localStorage.getItem('tv_token');

  const { data } = useQuery<{ data: TvData }>({
    queryKey: ['tv-data'],
    queryFn: () =>
      api
        .get('/api/tv/data', {
          headers: tvToken ? { Authorization: `Bearer ${tvToken}` } : undefined,
        })
        .then((r) => r.data),
    refetchInterval: 30000,
  });

  const tv = data?.data;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-gray-900 text-white p-8 flex flex-col"
      onMouseMove={() => setShowExit(true)}
      onMouseLeave={() => setShowExit(false)}
    >
      {showExit && (
        <button
          onClick={() => navigate('/dashboard')}
          className="fixed top-4 right-4 z-50 bg-white/20 p-3 rounded-full hover:bg-white/30 transition-colors"
        >
          <LogOut size={24} />
        </button>
      )}

      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Tv size={36} className="text-accent" />
            <div>
              <h1 className="font-poppins font-bold text-2xl">Baitul Maal</h1>
              <p className="text-white/70 text-sm">
                Laporan Keuangan Masjid {tv?.profil_masjid?.nama_masjid || '...'}
              </p>
            </div>
          </div>
        </div>
        <Clock />
      </div>

      <div className="grid grid-cols-4 gap-6 flex-1">
        <div className="col-span-3">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-6">
            <p className="text-white/70 text-lg">Total Saldo Kas Utama</p>
            <div className="flex items-end gap-4 mt-2">
              <h2 className="font-jetbrains text-6xl font-bold">
                {formatRupiah(tv?.total_saldo || 0)}
              </h2>
              {tv?.status_audit_terverifikasi && (
                <div className="flex items-center gap-1 bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">
                  <ShieldCheck size={16} />
                  Terverifikasi
                </div>
              )}
            </div>
            {tv?.update_terakhir && (
              <p className="text-white/50 text-sm mt-2">
                Update Terakhir: {formatDateLong(tv.update_terakhir)} | {new Date(tv.update_terakhir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          <div className="bg-white/5 backdrop-blur rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4">Transaksi Terakhir</h3>
            <div className="space-y-2">
              {tv?.transaksi_terakhir?.slice(0, 10).map((t) => (
                <div key={t.id} className="flex justify-between items-center py-2 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    {t.tipe === 'pemasukan' ? (
                      <ArrowUpRight size={16} className="text-green-300" />
                    ) : (
                      <ArrowDownRight size={16} className="text-red-300" />
                    )}
                    <span className="text-white/80">{t.deskripsi || '-'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-white/10 rounded text-xs">{t.kategori}</span>
                    <span className={`font-jetbrains font-medium ${t.tipe === 'pemasukan' ? 'text-green-300' : 'text-red-300'}`}>
                      {t.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(t.nominal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
            <p className="text-white/60 text-sm">Saldo Zakat</p>
            <p className="font-jetbrains text-2xl font-bold mt-1">{formatRupiah(tv?.saldo_zakat || 0)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
            <p className="text-white/60 text-sm">Saldo Infaq & Shadaqah</p>
            <p className="font-jetbrains text-2xl font-bold mt-1">{formatRupiah(tv?.saldo_infaq_shadaqah || 0)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
            <p className="text-white/60 text-sm">Saldo Wakaf & Anak Yatim</p>
            <p className="font-jetbrains text-2xl font-bold mt-1">{formatRupiah(tv?.saldo_wakaf_anak_yatim || 0)}</p>
          </div>

          <div className="bg-accent/20 backdrop-blur rounded-2xl p-6 flex-1">
            <h3 className="font-semibold text-accent-light mb-3">Pengumuman Penting</h3>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {tv?.pengumuman?.map((p, i) => (
                <div key={i} className="border-b border-accent/20 pb-2">
                  <p className="text-sm text-white/60">{new Date(p.created_at).toLocaleDateString('id-ID')}</p>
                  <p className="text-sm font-medium">{p.judul}</p>
                  <p className="text-xs text-white/70 mt-1">{p.isi}</p>
                </div>
              ))}
              {(!tv?.pengumuman || tv.pengumuman.length === 0) && (
                <p className="text-white/50 text-sm">Tidak ada pengumuman</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
