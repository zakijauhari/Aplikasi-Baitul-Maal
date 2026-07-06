import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, FolderTree, Megaphone, Users, ShieldCheck, Plus, Edit2, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { formatRupiah } from '../lib/api';
import { Kategori, Pengumuman, ProfilMasjid } from '../types';

type Tab = 'profil' | 'kategori' | 'pengumuman' | 'users';

export default function Pengaturan() {
  const [activeTab, setActiveTab] = useState<Tab>('profil');
  const queryClient = useQueryClient();

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'profil', label: 'Profil Masjid', icon: Building2 },
    { key: 'kategori', label: 'Kategori Dana', icon: FolderTree },
    { key: 'pengumuman', label: 'Pengumuman', icon: Megaphone },
    { key: 'users', label: 'Kelola User', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-poppins font-semibold text-xl text-primary">Pengaturan</h2>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="card">
        {activeTab === 'profil' && <ProfilMasjidSection />}
        {activeTab === 'kategori' && <KategoriSection />}
        {activeTab === 'pengumuman' && <PengumumanSection />}
        {activeTab === 'users' && <UsersSection />}
      </div>
    </div>
  );
}

function ProfilMasjidSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ data: ProfilMasjid }>({
    queryKey: ['profil-masjid'],
    queryFn: () => api.get('/api/profil-masjid').then((r) => r.data),
  });

  const [namaMasjid, setNamaMasjid] = useState('');
  const [alamat, setAlamat] = useState('');
  const [auditStatus, setAuditStatus] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (data?.data && !loaded) {
    setNamaMasjid(data.data.nama_masjid);
    setAlamat(data.data.alamat || '');
    setAuditStatus(data.data.status_audit_terverifikasi);
    setLoaded(true);
  }

  const saveMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.put('/api/profil-masjid', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    onSuccess: () => {
      toast.success('Profil masjid berhasil disimpan');
      queryClient.invalidateQueries({ queryKey: ['profil-masjid'] });
    },
  });

  const handleSave = () => {
    const fd = new FormData();
    fd.append('nama_masjid', namaMasjid);
    fd.append('alamat', alamat);
    fd.append('status_audit_terverifikasi', String(auditStatus));
    saveMutation.mutate(fd);
  };

  if (isLoading) return <div className="animate-pulse h-40 bg-gray-100 rounded-lg" />;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-primary">Profil Masjid</h3>
      <div>
        <label className="block text-sm text-muted mb-1">Nama Masjid</label>
        <input value={namaMasjid} onChange={(e) => setNamaMasjid(e.target.value)} className="input-field" />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1">Alamat</label>
        <textarea value={alamat} onChange={(e) => setAlamat(e.target.value)} className="input-field" rows={3} />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1">Logo Masjid</label>
        <input type="file" accept="image/*" className="input-field" />
        {data?.data?.logo_url && (
          <img src={data.data.logo_url} alt="Logo" className="w-20 h-20 object-cover rounded-lg mt-2" />
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={auditStatus}
          onChange={(e) => setAuditStatus(e.target.checked)}
          className="w-5 h-5 rounded border-gray-300 text-primary"
        />
        <label className="text-sm">Status Audit Terverifikasi (tampil di Mode TV)</label>
      </div>
      <button onClick={handleSave} className="btn-primary flex items-center gap-2">
        <Save size={18} /> Simpan
      </button>
    </div>
  );
}

function KategoriSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ data: Kategori[] }>({
    queryKey: ['kategori-all'],
    queryFn: () => api.get('/api/kategori/all').then((r) => r.data),
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newUrutan, setNewUrutan] = useState('');

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await api.put(`/api/kategori/${id}`, { is_active: !current });
      toast.success('Status kategori diubah');
      queryClient.invalidateQueries({ queryKey: ['kategori-all'] });
    } catch {}
  };

  const updateKategori = async (id: string) => {
    try {
      await api.put(`/api/kategori/${id}`, { nama: editNama });
      toast.success('Kategori diupdate');
      setEditId(null);
      queryClient.invalidateQueries({ queryKey: ['kategori-all'] });
    } catch {}
  };

  const addKategori = async () => {
    if (!newNama.trim()) return;
    try {
      await api.post('/api/kategori', { nama: newNama, urutan_tampil: Number(newUrutan) || 0 });
      toast.success('Kategori ditambahkan');
      setNewNama('');
      setNewUrutan('');
      queryClient.invalidateQueries({ queryKey: ['kategori-all'] });
    } catch {}
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-primary">Kategori Dana</h3>

      <div className="flex gap-2">
        <input
          value={newNama}
          onChange={(e) => setNewNama(e.target.value)}
          placeholder="Nama kategori baru"
          className="input-field flex-1"
        />
        <input
          value={newUrutan}
          onChange={(e) => setNewUrutan(e.target.value.replace(/\D/g, ''))}
          placeholder="Urutan"
          className="input-field w-20"
        />
        <button onClick={addKategori} className="btn-primary flex items-center gap-1 text-sm">
          <Plus size={16} /> Tambah
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-gray-100">
              <th className="pb-3 font-medium">Nama</th>
              <th className="pb-3 font-medium">Saldo</th>
              <th className="pb-3 font-medium">Aktif</th>
              <th className="pb-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map((k) => (
              <tr key={k.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3">
                  {editId === k.id ? (
                    <input value={editNama} onChange={(e) => setEditNama(e.target.value)} className="input-field text-sm" />
                  ) : (
                    k.nama
                  )}
                </td>
                <td className="py-3 font-jetbrains">{formatRupiah(k.saldo)}</td>
                <td className="py-3">
                  <button
                    onClick={() => toggleActive(k.id, k.is_active)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      k.is_active ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'
                    }`}
                  >
                    {k.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                </td>
                <td className="py-3">
                  {editId === k.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => updateKategori(k.id)} className="text-success">
                        <Save size={16} />
                      </button>
                      <button onClick={() => setEditId(null)} className="text-muted">
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditId(k.id); setEditNama(k.nama); }}
                      className="text-accent"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PengumumanSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ data: Pengumuman[] }>({
    queryKey: ['pengumuman'],
    queryFn: () => api.get('/api/pengumuman').then((r) => r.data),
  });

  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const addPengumuman = async () => {
    if (!judul.trim() || !isi.trim()) return;
    try {
      await api.post('/api/pengumuman', { judul, isi, aktif: true });
      toast.success('Pengumuman ditambahkan');
      setJudul('');
      setIsi('');
      queryClient.invalidateQueries({ queryKey: ['pengumuman'] });
    } catch {}
  };

  const toggleAktif = async (id: string, current: boolean) => {
    try {
      await api.put(`/api/pengumuman/${id}`, { aktif: !current });
      queryClient.invalidateQueries({ queryKey: ['pengumuman'] });
    } catch {}
  };

  const deletePengumuman = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    try {
      await api.delete(`/api/pengumuman/${id}`);
      toast.success('Pengumuman dihapus');
      queryClient.invalidateQueries({ queryKey: ['pengumuman'] });
    } catch {}
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-primary">Pengumuman Mode TV</h3>

      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
        <input
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          placeholder="Judul pengumuman"
          className="input-field"
        />
        <textarea
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          placeholder="Isi pengumuman"
          className="input-field"
          rows={3}
        />
        <button onClick={addPengumuman} className="btn-primary text-sm flex items-center gap-1">
          <Plus size={16} /> Tambah Pengumuman
        </button>
      </div>

      <div className="space-y-2">
        {data?.data?.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{p.judul}</p>
              <p className="text-xs text-muted truncate">{p.isi}</p>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={() => toggleAktif(p.id, p.aktif)}
                className={`px-2 py-0.5 rounded-full text-xs ${p.aktif ? 'bg-green-50 text-success' : 'bg-gray-200 text-gray-500'}`}
              >
                {p.aktif ? 'Aktif' : 'Nonaktif'}
              </button>
              <button onClick={() => deletePengumuman(p.id)} className="text-danger">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ data: any[] }>({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then((r) => r.data),
  });

  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');

  const addUser = async () => {
    if (!username || !password || !fullName) return;
    try {
      await api.post('/api/users', { username, password, full_name: fullName, role });
      toast.success('User ditambahkan');
      setUsername('');
      setPassword('');
      setFullName('');
      setRole('viewer');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch {}
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await api.put(`/api/users/${id}`, { is_active: !current });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Status user diubah');
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-primary">Kelola User</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-1">
          <Plus size={16} /> Tambah User
        </button>
      </div>

      {showForm && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="input-field" />
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama Lengkap" className="input-field" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input-field" />
          <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'viewer')} className="input-field">
            <option value="viewer">Viewer (Jamaah)</option>
            <option value="admin">Admin (Bendahara)</option>
          </select>
          <button onClick={addUser} className="btn-primary text-sm">Simpan</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-gray-100">
              <th className="pb-3 font-medium">Username</th>
              <th className="pb-3 font-medium">Nama</th>
              <th className="pb-3 font-medium">Role</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data?.data?.map((u: any) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3">{u.username}</td>
                <td className="py-3">{u.full_name}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : 'Viewer'}
                  </span>
                </td>
                <td className="py-3">
                  <button
                    onClick={() => toggleActive(u.id, u.is_active)}
                    className={`px-2 py-1 rounded-full text-xs ${u.is_active ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}
                  >
                    {u.is_active ? 'Aktif' : 'Nonaktif'}
                  </button>
                </td>
                <td className="py-3">
                  <button onClick={() => toggleActive(u.id, u.is_active)} className="text-accent">
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
