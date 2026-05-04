import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sku: string | null;
};

export default function SupabaseCatalogTest() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('products')
        .select('id, name, slug, price, sku')
        .order('name', { ascending: true })
        .limit(20);

      if (error) {
        setError(error.message);
        setItems([]);
      } else {
        setItems(data || []);
      }

      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <div>Загрузка товаров из Supabase...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h1>Тест каталога из Supabase</h1>
      <p>Найдено: {items.length}</p>

      <ul style={{ marginTop: '16px' }}>
        {items.map((item) => (
          <li key={item.id} style={{ marginBottom: '12px' }}>
            <div>{item.name}</div>
            <div>slug: {item.slug}</div>
            <div>sku: {item.sku || '—'}</div>
            <div>price: {item.price}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}