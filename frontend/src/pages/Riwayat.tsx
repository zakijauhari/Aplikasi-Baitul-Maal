import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, Eye, Edit2, Trash2, Search, X, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { formatRupiah, formatDateShort } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { TransaksiListData, Kategori } from '../types';

export default function Riwayat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [page, setPage] = useState(1);
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalAkhir, setTanggalAkhir] = useState('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterTipe, setFilterTipe] = useState('');
  const [filterMetode, setFilterMetode] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const params = new URLSearchParams();
  params.set('page', String(page));
  if (q) params.set('q', q);
  if (tanggalMulai) params.set('tanggal_mulai', tanggalMulai);
  if (tanggalAkhir) params.set('tanggal_akhir', tanggalAkhir);
  if (filterKategori) params.set('kategori_id', filterKategori);
  if (filterTipe) params.set('tipe', filterTipe);
  if (filterMetode) params.set('metode', filterMetode);

  const { data, isLoading } = useQuery<{ data: TransaksiListData }>({
    queryKey: ['transaksi', page, q, tanggalMulai, tanggalAkhir, filterKategori, filterTipe, filterMetode],
    queryFn: () => api.get(`/api/transaksi?${params.toString()}`).then((r) => r.data),
  });

  const { data: kategoriData } = useQuery<{ data: Kategori[] }>({
    queryKey: ['kategori'],
    queryFn: () => api.get('/api/kategori').then((r) => r.data),
  });

  const transaksi = data?.data;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(searchInput);
    setPage(1);
    if (searchInput) {
      setSearchParams({ q: searchInput });
    } else {
      setSearchParams({});
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return;
    try {
      await api.delete(`/api/transaksi/${id}`);
      toast.success('Transaksi berhasil dihapus');
    } catch {
      // handled by interceptor
    }
  };

  const clearFilters = () => {
    setTanggalMulai('');
    setTanggalAkhir('');
    setFilterKategori('');
    setFilterTipe('');
    setFilterMetode('');
    setQ('');
    setSearchInput('');
    setPage(1);
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      <h2 className="font-poppins font-semibold text-xl text-primary">Riwayat Keuangan</h2>

      {transaksi?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-muted">Total Kas</p>
            <p className="font-jetbrains font-semibold text-xl mt-1">
              {formatRupiah(transaksi.summary.total_kas)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-muted">Total Pemasukan</p>
            <p className="font-jetbrains font-semibold text-xl mt-1 text-success">
              +{formatRupiah(transaksi.summary.total_pemasukan)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-muted">Total Pengeluaran</p>
            <p className="font-jetbrains font-semibold text-xl mt-1 text-danger">
              -{formatRupiah(transaksi.summary.total_pengeluaran)}
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Cari deskripsi..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button type="submit" className="btn-primary text-sm">Cari</button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-outline text-sm flex items-center gap-1 ${showFilters ? 'bg-primary/5' : ''}`}
          >
            <Filter size={16} />
            Filter
          </button>
        </form>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-xs text-muted">Tanggal Mulai</label>
              <input type="date" value={tanggalMulai} onChange={(e) => { setTanggalMulai(e.target.value); setPage(1); }} className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted">Tanggal Akhir</label>
              <input type="date" value={tanggalAkhir} onChange={(e) => { setTanggalAkhir(e.target.value); setPage(1); }} className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted">Kategori</label>
              <select value={filterKategori} onChange={(e) => { setFilterKategori(e.target.value); setPage(1); }} className="input-field text-sm">
                <option value="">Semua</option>
                {kategoriData?.data?.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted">Tipe</label>
              <select value={filterTipe} onChange={(e) => { setFilterTipe(e.target.value); setPage(1); }} className="input-field text-sm">
                <option value="">Semua</option>
                <option value="pemasukan">Pemasukan</option>
                <option value="pengeluaran">Pengeluaran</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted">Metode</label>
              <select value={filterMetode} onChange={(e) => { setFilterMetode(e.target.value); setPage(1); }} className="input-field text-sm">
                <option value="">Semua</option>
                <option value="cash">Tunai</option>
                <option value="transfer">Transfer</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
            <div className="col-span-full flex justify-end">
              <button onClick={clearFilters} className="text-sm text-muted hover:text-primary flex items-center gap-1">
                <X size={14} /> Hapus Filter
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : transaksi?.items && transaksi.items.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b border-gray-100">
                    <th className="pb-3 font-medium">Tanggal</th>
                    <th className="pb-3 font-medium">Kategori</th>
                    <th className="pb-3 font-medium">Keterangan</th>
                    <th className="pb-3 font-medium">Nominal</th>
                    <th className="pb-3 font-medium">Bukti</th>
                    <th className="pb-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {transaksi.items.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3">{formatDateShort(t.tanggal)}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 bg-green-50 text-primary text-xs rounded-full">
                          {t.kategori.nama}
                        </span>
                      </td>
                      <td className="py-3 max-w-[200px] truncate">{t.deskripsi || '-'}</td>
                      <td className={`py-3 font-jetbrains font-medium ${t.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}`}>
                        {t.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(t.nominal)}
                      </td>
                      <td className="py-3">
                        {t.bukti_url ? (
                          <a href={t.bukti_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                            <Download size={16} />
                          </a>
                        ) : '-'}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button className="p-1.5 hover:bg-gray-100 rounded" title="Detail">
                            <Eye size={16} className="text-muted" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => navigate(`/transaksi/edit/${t.id}`)}
                                className="p-1.5 hover:bg-gray-100 rounded"
                                title="Edit"
                              >
                                <Edit2 size={16} className="text-accent" />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="p-1.5 hover:bg-red-50 rounded"
                                title="Hapus"
                              >
                                <Trash2 size={16} className="text-danger" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {transaksi.items.map((t) => (
                <div key={t.id} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-muted">{formatDateShort(t.tanggal)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      t.tipe === 'pemasukan' ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'
                    }`}>
                      {t.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                  </div>
                  <p className="font-medium text-sm">{t.kategori.nama}</p>
                  {t.deskripsi && <p className="text-xs text-muted mt-1">{t.deskripsi}</p>}
                  <div className="flex justify-between items-center mt-2">
                    <span className={`font-jetbrains font-semibold ${t.tipe === 'pemasukan' ? 'text-success' : 'text-danger'}`}>
                      {t.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(t.nominal)}
                    </span>
                    <div className="flex gap-2">
                      {t.bukti_url && (
                        <a href={t.bukti_url} target="_blank" rel="noopener noreferrer" className="text-accent">
                          <Download size={16} />
                        </a>
                      )}
                      {isAdmin && (
                        <>
                          <button onClick={() => navigate(`/transaksi/edit/${t.id}`)} className="text-accent">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="text-danger">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {transaksi.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-muted">
                  Hal {transaksi.page} dari {transaksi.total_pages} (total {transaksi.total_items})
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="btn-outline p-2 disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(transaksi.total_pages, page + 1))}
                    disabled={page >= transaksi.total_pages}
                    className="btn-outline p-2 disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted">
            <p>Tidak ada transaksi yang cocok dengan filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
