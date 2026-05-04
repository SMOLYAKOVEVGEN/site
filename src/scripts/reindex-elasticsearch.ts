import { reindexAllProductsToElasticsearch } from '@/lib/search/elasticsearch-indexer';

async function main(): Promise<void> {
  const result = await reindexAllProductsToElasticsearch();
  console.log(`Elasticsearch reindex completed. Indexed products: ${result.indexed}`);
}

main().catch((error) => {
  console.error('Elasticsearch reindex failed');
  console.error(error);
  process.exit(1);
});