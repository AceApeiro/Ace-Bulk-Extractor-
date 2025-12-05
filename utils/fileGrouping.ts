
import { Case, CaseFiles, ParsingStatus } from '../types';

// Helper to extract ArXiv ID from filename
const extractArxivId = (filename: string): string | null => {
  const match = filename.match(/(\d{4}\.\d{4,5})(v\d+)?/);
  return match ? match[0] : null;
};

// Generate a random ID if no ArXiv ID found (for unmatched files)
const generateId = () => Math.random().toString(36).substring(2, 9);

export const groupFilesIntoCases = (files: File[]): Case[] => {
  const casesMap = new Map<string, Partial<CaseFiles>>();
  const unmatchedFiles: File[] = [];

  // 1. First Pass: Identify core IDs
  files.forEach(file => {
    const arxivIdMatch = extractArxivId(file.name);
    // Strip version for grouping key (e.g. 2405.12345v1 -> 2405.12345)
    const baseId = arxivIdMatch ? arxivIdMatch.split('v')[0] : null;

    if (baseId) {
      if (!casesMap.has(baseId)) {
        casesMap.set(baseId, { pdf: null, api: null, html: null, scrape: null });
      }
      
      const current = casesMap.get(baseId)!;
      const lowerName = file.name.toLowerCase();

      // Assign based on extension/name patterns
      // Logic Priority: PDF > HTML > Scrape (explicit) > API (explicit) > JSON Fallback
      
      if (lowerName.endsWith('.pdf')) {
        current.pdf = file;
      } 
      else if (lowerName.endsWith('.html') || lowerName.endsWith('.htm')) {
        current.html = file;
      } 
      else if (lowerName.includes('scrape') || lowerName.includes('scraping') || lowerName.includes('scrapping')) {
        // Catch-all for scrape files (json, txt, etc)
        current.scrape = file;
      }
      else if (lowerName.includes('api')) {
        current.api = file;
      }
      else if (lowerName.endsWith('.json')) {
        // Fallback for generic JSON: If we already have API, assume scrape, otherwise API
        if (current.api) {
            current.scrape = file;
        } else {
            // Default generic JSON to API unless it looks like scrape data
            current.api = file;
        }
      } else {
         // Generic text files often scrape data if not matched elsewhere
         if (!current.scrape) current.scrape = file;
      }

    } else {
      unmatchedFiles.push(file);
    }
  });

  // 2. Convert Map to Case Array
  const cases: Case[] = Array.from(casesMap.entries()).map(([baseId, fileSet]) => ({
    id: baseId, // Use ArXiv ID as case ID
    name: baseId,
    status: ParsingStatus.IDLE,
    files: {
      pdf: fileSet.pdf || null,
      api: fileSet.api || null,
      html: fileSet.html || null,
      scrape: fileSet.scrape || null
    },
    extractedData: null
  }));

  // 3. Handle Unmatched PDFs (Create new cases for orphan PDFs)
  unmatchedFiles.forEach(file => {
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const id = generateId();
      cases.push({
        id: id,
        name: file.name.replace('.pdf', ''),
        status: ParsingStatus.IDLE,
        files: {
          pdf: file,
          api: null,
          html: null,
          scrape: null
        },
        extractedData: null
      });
    }
  });

  return cases;
};
