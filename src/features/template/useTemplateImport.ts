'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRaid } from '@/features/template/RaidContext';
import type { ImportedTemplateFile } from '@/features/template/templateFileIO';

export function useTemplateImport() {
  const router = useRouter();
  const { loadTemplate } = useRaid();

  return useCallback((template: string | object, source: ImportedTemplateFile | null = null) => {
    const importedTemplate = loadTemplate(template, source);
    router.push('/players');
    return importedTemplate;
  }, [loadTemplate, router]);
}
