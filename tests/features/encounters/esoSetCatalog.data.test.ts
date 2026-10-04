import { describe, expect, it } from 'vitest';
import { fetchSetById, fetchSetCatalogIndex } from '@/lib/esoSetCatalog';

describe('static ESO set catalog data', () => {
  it('loads the static index and set shards from local data', async () => {
    const index = await fetchSetCatalogIndex();
    expect(index.sets).toHaveLength(714);

    const siroria = await fetchSetById(390);
    expect(siroria).toMatchObject({ id: 390, setName: 'Mantle of Siroria' });
  });
});