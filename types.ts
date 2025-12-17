

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
  alias?: string;
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
  text: string; // The original source text (e.g., "_______, et al.")
  fullText: string; // The resolved text (e.g., "Smith, J., et al.")
}

export interface VerificationResult {
  status: 'SUCCESS' | 'SUMMARY_MISMATCHED' | 'VERSION_MISMATCHED' | 'MATCH_BY_TITLE' | 'AUTHOR_MISMATCH' | 'CHECK_REQUIRED';
  message: string;
  idComparison: {
    pdfId?: string;
    pdfVersion?: string;
    htmlId?: string;
    htmlVersion?: string;
    scrapeId?: string;
    scrapeVersion?: string;
    apiId?: string;
    apiVersion?: string;
    versionMatch: boolean; // True if v1=v1 etc
  };
  titleComparison: {
    pdfTitle?: string;
    htmlTitle?: string;
    match: boolean;
    sourceUsed: 'HTML' | 'PDF';
  };
  authorComparison: {
    match: boolean;
    details: string; // e.g. "Scenario 2: API Expands Initial"
    pdfCount: number;
    apiCount: number;
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
  references: Reference[]; // Updated to use Reference objects
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
  
  // Timings
  startTime?: number; // Timestamp extraction started
  endTime?: number; // Timestamp extraction finished
  processingTime?: number; // Duration of AI extraction (ms)
  
  // QC Timings
  qcStartTime?: number; // Timestamp user started reviewing (usually same as endTime)
  qcEndTime?: number; // Timestamp user clicked Finalize/Download
  qcDuration?: number; // Duration of manual review
  
  isEdited?: boolean; // Track if user manually saved changes
  manualId?: string;
}

export interface HistoricalSession {
    sessionId: string;
    date: string;
    cases: Case[];
    stats: {
        total: number;
        completed: number;
        avgDuration: number;
    }
}

// --- USER MANAGEMENT ---

export type UserRole = 'ADMIN' | 'OPERATOR';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  avatar?: string;
}