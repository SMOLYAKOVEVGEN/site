import type { WixDataItem } from './types';

export interface PaginationOptions {
  limit?: number;
  skip?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  hasNext: boolean;
  currentPage: number;
  pageSize: number;
  nextSkip: number | null;
}

const collections: Record<string, unknown[]> = {
  products: [],
  services: [],
  brands: [],
  articles: [],
  productcategories: [],
};

function getCollection<T>(collectionId: string): T[] {
  const collection = collections[collectionId];
  if (!collection) {
    return [];
  }
  return [...collection] as T[];
}

export class BaseCrudService {
  static async getAll<T extends WixDataItem>(
    collectionId: string,
    _includeRefs?: unknown,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const allItems = getCollection<T>(collectionId);
    const limit = Math.min(pagination?.limit ?? allItems.length ?? 50, 1000);
    const skip = pagination?.skip ?? 0;
    const items = allItems.slice(skip, skip + limit);
    const hasNext = skip + limit < allItems.length;

    return {
      items,
      totalCount: allItems.length,
      hasNext,
      currentPage: Math.floor(skip / Math.max(limit, 1)),
      pageSize: limit,
      nextSkip: hasNext ? skip + limit : null,
    };
  }

  static async getById<T extends WixDataItem>(collectionId: string, itemId: string): Promise<T | null> {
    const allItems = getCollection<T>(collectionId);
    return allItems.find((item) => item._id === itemId) ?? null;
  }

  static async create<T extends WixDataItem>(collectionId: string, itemData: Partial<T>): Promise<T> {
    const newItem = { _id: crypto.randomUUID(), ...itemData } as T;

    if (!collections[collectionId]) {
      collections[collectionId] = [];
    }

    collections[collectionId].push(newItem as unknown);
    return newItem;
  }

  static async update<T extends WixDataItem>(collectionId: string, itemData: T): Promise<T> {
    if (!collections[collectionId]) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    const collection = collections[collectionId] as WixDataItem[];
    const index = collection.findIndex((item) => item._id === itemData._id);

    if (index === -1) {
      throw new Error(`Item not found in ${collectionId}`);
    }

    collection[index] = { ...collection[index], ...itemData };
    return collection[index] as T;
  }

  static async delete<T extends WixDataItem>(collectionId: string, itemId: string): Promise<T> {
    if (!collections[collectionId]) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    const collection = collections[collectionId] as WixDataItem[];
    const index = collection.findIndex((item) => item._id === itemId);

    if (index === -1) {
      throw new Error(`Item not found in ${collectionId}`);
    }

    const [removed] = collection.splice(index, 1);
    return removed as T;
  }
}