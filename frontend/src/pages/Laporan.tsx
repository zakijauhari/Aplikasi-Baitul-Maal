import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { LaporanArsip } from '../types';

export default function Laporan() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  const { data: arsipData, isLoading, refetch } = useQuery<{ data: LaporanArsip[] }>({
    queryKey: ['laporan-arsip'],
    queryFn: () => api.get('/api/laporan/arsip').then((r) => r.data),
  });

  const arsipList = arsipData?.data || [];
  const existingLaporan = arsipList.find((a) => a.bulan === bulan && a.tahun === tahun);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post('/api/laporan/generate', { bulan, tahun });
      toast.success('Laporan berhasil digenerate');
      refetch();
    } catch {
      // handled by interceptor
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-poppins font-semibold text-xl text-primary">Laporan Keuangan</h2>

      <div className="card">
        <h3 className="font-medium text-primary mb-4">Generate Laporan Bulanan</h3>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div>
            <label className="block text-sm text-muted mb-1">Bulan</label>
            <select
              value={bulan}
              onChange={(e) => setBulan(Number(e.target.value))}
              className="input-field"
            >
              {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
              ].map((nama, i) => (
                <option key={i + 1} value={i + 1}>{nama}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Tahun</label>
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="input-field"
            >
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {isAdmin ? (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary flex items-center gap-2"
            >
              {generating ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <FileText size={18} />
              )}
              {generating ? 'Mengenerate...' : 'Generate PDF'}
            </button>
          ) : (
            <div className="text-sm text-muted">
              {existingLaporan
                ? 'Laporan tersedia, silakan download di bawah'
                : 'Laporan belum tersedia untuk periode ini, hubungi bendahara.'}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-medium text-primary mb-4">Arsip Laporan</h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : arsipList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-gray-100">
                  <th className="pb-3 font-medium">Periode</th>
                  <th className="pb-3 font-medium">Dibuat</th>
                  <th className="pb-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {arsipList.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3">{['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][a.bulan]} {a.tahun}</td>
                    <td className="py-3 text-muted">{new Date(a.generated_at).toLocaleDateString('id-ID')}</td>
                    <td className="py-3">
                      <a
                        href={`${import.meta.env.VITE_API_BASE_URL || ''}${a.download_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline text-xs flex items-center gap-1 inline-flex"
                      >
                        <Download size={14} />
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted text-center py-8">Belum ada laporan yang digenerate</p>
        )}
      </div>
    </div>
  );
}
