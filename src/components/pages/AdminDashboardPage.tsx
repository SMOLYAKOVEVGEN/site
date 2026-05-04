import { useEffect, useState } from 'react';
import { getAdminDashboardStats } from '@/lib/admin-service';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ products: 0, categories: 0, brands: 0 });

  useEffect(() => {
    getAdminDashboardStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-heading text-graphite mb-8">Админка каталога</h1>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-2">Товары</div>
          <div className="text-4xl font-heading">{stats.products}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-2">Категории</div>
          <div className="text-4xl font-heading">{stats.categories}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="text-sm text-slate-500 mb-2">Бренды</div>
          <div className="text-4xl font-heading">{stats.brands}</div>
        </div>
      </div>
    </div>
  );
}