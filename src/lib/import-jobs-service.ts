import { supabase } from '@/lib/supabase';

export type ImportJobRow = {
  id: string;
  job_type: string;
  file_bucket: string;
  file_path: string;
  status: string;
  total_items: number | null;
  processed_items: number;
  success_items: number;
  error_items: number;
  offset_items: number;
  batch_size: number;
  root_group_slug: string | null;
  root_group_name: string | null;
  error_log: unknown;
  meta: unknown;
  locked_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

function normalizeFileName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-');
}

export async function uploadCatalogJsonToStorage(file: File): Promise<{
  bucket: string;
  filePath: string;
}> {
  const bucket = 'catalog-media';
  const filePath = `imports/catalog-json/${Date.now()}-${file.name}`;

  const res = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      upsert: false,
      contentType: 'application/json',
    });

  console.log('UPLOAD_RESULT', res);

  if (res.error) throw res.error;

  return { bucket, filePath };
}

export async function createCatalogImportJob(params: {
  bucket: string;
  filePath: string;
  batchSize?: number;
  rootGroupSlug?: string;
  rootGroupName?: string;
}): Promise<ImportJobRow> {
  const { data, error } = await supabase
    .from('import_jobs')
    .insert({
      job_type: 'catalog_result',
      file_bucket: params.bucket,
      file_path: params.filePath,
      batch_size: params.batchSize ?? 200,
      root_group_slug: params.rootGroupSlug ?? null,
      root_group_name: params.rootGroupName ?? null,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw error;

  return data as ImportJobRow;
}

export async function getImportJob(jobId: string): Promise<ImportJobRow | null> {
  const { data, error } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error) throw error;
  return (data as ImportJobRow | null) || null;
}