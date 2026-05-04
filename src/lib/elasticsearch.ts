import dotenv from 'dotenv';
import { Client } from '@elastic/elasticsearch';

dotenv.config();

function readEnv(name: string): string {
  const valueFromProcess = String(process.env[name] || '').trim();
  if (valueFromProcess) return valueFromProcess;

  const valueFromImportMeta =
    typeof import.meta !== 'undefined' &&
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      ? String(
          (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[name] || ''
        ).trim()
      : '';

  return valueFromImportMeta;
}

const ELASTICSEARCH_NODE = readEnv('ELASTICSEARCH_NODE');
const ELASTICSEARCH_USERNAME = readEnv('ELASTICSEARCH_USERNAME');
const ELASTICSEARCH_PASSWORD = readEnv('ELASTICSEARCH_PASSWORD');

if (!ELASTICSEARCH_NODE) {
  throw new Error('ELASTICSEARCH_NODE is not set');
}

if (!ELASTICSEARCH_USERNAME) {
  throw new Error('ELASTICSEARCH_USERNAME is not set');
}

if (!ELASTICSEARCH_PASSWORD) {
  throw new Error('ELASTICSEARCH_PASSWORD is not set');
}

export const ELASTICSEARCH_PRODUCTS_INDEX = readEnv('ELASTICSEARCH_PRODUCTS_INDEX') || 'products';

export const elasticsearch = new Client({
  node: ELASTICSEARCH_NODE,
  auth: {
    username: ELASTICSEARCH_USERNAME,
    password: ELASTICSEARCH_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export async function pingElasticsearch(): Promise<boolean> {
  try {
    const response = await elasticsearch.ping();
    return Boolean(response);
  } catch (error) {
    console.error('Elasticsearch ping failed', error);
    return false;
  }
}