
export interface Author {
  firstName: string;
  surname: string;
  initials: string;
  suffix?: string;
  degree?: string;
  affiliationIndices: number[]; // Maps to the index in the affiliations array
  email?: string;
  orcid?: string;
  isCorresponding?: boolean; // If marked with * or envelope or text
  role?: string; // e.g. Collaboration, Committee
}

export interface Affiliation {
  id: number;
  text: string; // Full source text
  organizations: string[]; // e.g. ["Department of Physics", "University of Milan"]
  addressPart?: string; // Street, building
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string; // ISO 3-letter code
}

export interface Reference {
  text: string;
  fullText: string;
}

export interface VerificationResult {
  status: 'SUCCESS' | 'SUMMARY_MISMATCHED' | 'VERSION_MISMATCHED' | 'MATCH_BY_TITLE';
  message: string;
  idComparison: {
    pdfId?: string;
    htmlId?: string;
    scrapeId?: string;
    apiId?: string;
  };
  titleComparison: {
    pdfTitle?: string;
    htmlTitle?: string;
    match: boolean;
  };
  authorComparison?: {
    match: boolean;
    details: string;
    pdfAuthorsSource?: string; // Names found in PDF
    apiAuthorsSource?: string; // Names found in API
  };
}

export interface ExtractedData {
  verification: VerificationResult; // New verification block
  arxivId: string; // versioned ID e.g., 2511.16734v1 (The final ID to be used)
  documentArxivId?: string; // The ID extracted specifically from the document text
  documentText?: string; // The full raw text extracted from the PDF
  idMatchStatus?: 'MATCH' | 'MISMATCH' | 'NOT_FOUND_IN_DOC'; // Validation status
  submissionDate?: string; // from HTML/API
  title: string;
  keywords: string[];
  categories: string[]; // e.g. cs.CV, cs.LG
  authors: Author[];
  affiliations: Affiliation[];
  abstract: string;
  references: string[]; // Full reference strings
  correspondence?: {
    emails: string[];
    addresses: string[]; // Indices or text
  };
}

export enum ParsingStatus {
  IDLE,
  PROCESSING,
  SUCCESS,
  ERROR
}

export interface MultiFileInput {
  pdfBase64?: string; // Made Optional for Optimization
  pdfText?: string; // OPTIMIZATION: Extracted text from client-side
  apiContent?: string;
  htmlContent?: string;
  scrapeContent?: string;
  manualId?: string;
}

// --- NEW TYPES FOR MULTI-PAGE/CASE SYSTEM ---

export interface CaseFiles {
  pdf: File | null;
  api: File | null;
  html: File | null;
  scrape: File | null;
}

export interface Case {
  id: string; // Internal UUID or ArXiv ID
  name: string; // Usually the ArXiv ID
  status: ParsingStatus;
  files: CaseFiles;
  extractedData: ExtractedData | null;
  error?: string;
  processingTime?: number; // ms duration
  startTime?: number; // Timestamp
  endTime?: number; // Timestamp
  isEdited?: boolean; // Track if user manually saved changes
  manualId?: string;
}
