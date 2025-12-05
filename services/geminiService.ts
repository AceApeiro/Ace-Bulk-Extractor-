
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExtractedData, MultiFileInput } from "../types";

// Output Schema with embedded Verification Logic
const outputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    verification: {
        type: Type.OBJECT,
        description: "The results of the specific pre-extraction verification steps.",
        properties: {
            status: { 
                type: Type.STRING, 
                enum: ['SUCCESS', 'SUMMARY_MISMATCHED', 'VERSION_MISMATCHED', 'MATCH_BY_TITLE'],
                description: "SUCCESS: IDs match exactly. SUMMARY_MISMATCHED: Base IDs differ. VERSION_MISMATCHED: Base IDs match but Version (v1, v2) differs. MATCH_BY_TITLE: PDF has no ID but Titles match."
            },
            message: { type: Type.STRING, description: "A brief reason for the status." },
            idComparison: {
                type: Type.OBJECT,
                properties: {
                    pdfId: { type: Type.STRING, nullable: true },
                    htmlId: { type: Type.STRING, nullable: true, description: "ID extracted from HTML Summary" },
                    scrapeId: { type: Type.STRING, nullable: true },
                    apiId: { type: Type.STRING, nullable: true }
                }
            },
            titleComparison: {
                type: Type.OBJECT,
                properties: {
                    pdfTitle: { type: Type.STRING, nullable: true },
                    htmlTitle: { type: Type.STRING, nullable: true },
                    match: { type: Type.BOOLEAN }
                }
            },
            authorComparison: {
                type: Type.OBJECT,
                properties: {
                    match: { type: Type.BOOLEAN },
                    details: { type: Type.STRING },
                    pdfAuthorsSource: { type: Type.STRING, nullable: true },
                    apiAuthorsSource: { type: Type.STRING, nullable: true }
                }
            }
        },
        required: ["status", "message", "idComparison", "titleComparison"]
    },
    arxivId: { type: Type.STRING, description: "The final validated ArXiv ID." },
    documentArxivId: { type: Type.STRING, nullable: true, description: "ID extracted specifically from the document text." },
    documentText: { type: Type.STRING, nullable: true, description: "The full text content of the document." },
    idMatchStatus: { type: Type.STRING, enum: ['MATCH', 'MISMATCH', 'NOT_FOUND_IN_DOC'], nullable: true },
    title: { type: Type.STRING },
    keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    categories: { type: Type.ARRAY, items: { type: Type.STRING } },
    authors: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                firstName: { type: Type.STRING },
                surname: { type: Type.STRING },
                initials: { type: Type.STRING },
                suffix: { type: Type.STRING, nullable: true },
                degree: { type: Type.STRING, nullable: true },
                email: { type: Type.STRING, nullable: true },
                orcid: { type: Type.STRING, nullable: true },
                isCorresponding: { type: Type.BOOLEAN, nullable: true },
                affiliationIndices: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                role: { type: Type.STRING, nullable: true }
            },
            required: ["firstName", "surname", "initials", "affiliationIndices"]
        }
    },
    affiliations: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.NUMBER },
                text: { type: Type.STRING },
                organizations: { type: Type.ARRAY, items: { type: Type.STRING } },
                addressPart: { type: Type.STRING, nullable: true },
                city: { type: Type.STRING, nullable: true },
                state: { type: Type.STRING, nullable: true },
                postalCode: { type: Type.STRING, nullable: true },
                country: { type: Type.STRING, nullable: true },
                countryCode: { type: Type.STRING, nullable: true }
            },
            required: ["id", "text", "organizations"]
        }
    },
    abstract: { type: Type.STRING },
    references: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["verification", "arxivId", "title", "authors", "affiliations", "abstract", "references"]
};

export const parseContentWithGemini = async (input: MultiFileInput): Promise<ExtractedData> => {
    const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = 'gemini-2.5-flash'; 

    // --- SMART PROMPT CONSTRUCTION ---
    const parts: any[] = [];
    
    // 1. Auxiliary Data Context
    let contextPrompt = "You are ACE (Apeiro Citation Extractor). Extract metadata from the academic paper.\n\n";
    contextPrompt += "--- SUPPORTING DATA (Use for Verification Only) ---\n";
    if (input.manualId) contextPrompt += `MANUAL OVERRIDE ID: ${input.manualId}\n`;
    if (input.apiContent) contextPrompt += `API METADATA (Do NOT use for ID Verification): ${input.apiContent}\n`;
    if (input.htmlContent) contextPrompt += `HTML LANDING PAGE SUMMARY (Use for ID/Version check): ${input.htmlContent}\n`;
    if (input.scrapeContent) contextPrompt += `SCRAPE DATA (Use for ID/Version check): ${input.scrapeContent}\n`;
    contextPrompt += "---------------------------------------------------\n\n";

    // 2. Primary Source (PDF) - Logic: Prefer Text (Fast) > Base64 (Vision/Slow)
    if (input.pdfText && input.pdfText.length > 500) {
        console.log("ACE Service: Using Text-Based Extraction (Fast Mode)");
        contextPrompt += "--- PRIMARY SOURCE (PDF TEXT EXTRACT) ---\n";
        contextPrompt += input.pdfText;
        parts.push({ text: contextPrompt });
    } else if (input.pdfBase64) {
        console.log("ACE Service: Using Vision-Based Extraction (Scan Mode)");
        parts.push({ text: contextPrompt });
        parts.push({
            inlineData: {
                mimeType: "application/pdf",
                data: input.pdfBase64
            }
        });
    } else {
        throw new Error("No PDF content provided (neither Text nor Base64).");
    }

    // 3. System Instructions (Business Rules)
    const systemPrompt = `
    PERFORM VERIFICATION FIRST (CRITICAL):
    1. EXTRACT ID & VERSION FROM 3 SOURCES:
       - **PDF**: Look for ID in margins, headers, or first page text (e.g., "arXiv:2405.12345v1").
       - **HTML (Summary)**: Look for ID and Version in the landing page content provided. It is often in the <title> or <h1> tag.
       - **SCRAPE**: Look for ID and Version in the scrape data.
    
    2. COMPARE THEM (3-WAY CHECK):
       - Extract the Base ID (e.g. 2405.12345) and Version (e.g. v1, v2) from all available sources.
       - **Base ID Check**: Do the numbers match across PDF, HTML, and Scrape? 
         - If ANY mismatch in numbers -> 'status' = 'SUMMARY_MISMATCHED'.
       - **Version Check**: Do the versions match?
         - If PDF has 'v1' (or no version implies v1) but HTML/Scrape has 'v2' -> 'status' = 'VERSION_MISMATCHED'.
         - If PDF has 'v2' and HTML has 'v2' -> Match.
    
    3. POPULATE 'verification' OBJECT:
       - Set 'idComparison.pdfId', 'idComparison.htmlId', 'idComparison.scrapeId' exactly as found in their respective sources (include version suffix).
       - Set 'status' based on the strict comparison results.
       - **Important**: For VERSION_MISMATCHED, use the *latest* version ID (from HTML/Scrape) as the main 'arxivId' for the extraction, but keep the status as mismatched so the user is warned.

    EXTRACTION RULES (CAR 2.0):
    1. AUTHORS: Extract First Name, Surname, Initials. 
       - **EXTRACT ORCID IDs**: Scan explicitly for the 16-digit ORCID format (e.g., 0000-0002-1825-0097). Look in footnotes, author info sections, or next to author names/symbols. Populate the 'orcid' field for each author if found.
       - Map affiliations using indices (0-based) based on superscripts/symbols.
       - Mark 'isCorresponding' = true if explicit text "Correspondence to", "Corresponding author", or symbols (*, ✉) indicate it.
    2. AFFILIATIONS: Split into Organization, City, Country, CountryCode (ISO 3-letter).
    3. REFERENCES: Extract full list. Remove 'Available at:' or URL prefixes if possible.
    4. ID: 'documentArxivId' is what you see in the PDF. 'arxivId' is the final ID to use (prefer Manual > Scrape > HTML > PDF).
    `;

    // 4. Call Model
    try {
        const response = await genAI.models.generateContent({
            model: modelId,
            contents: { parts: parts },
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: outputSchema,
                temperature: 0.1 // Low temp for factual extraction
            }
        });

        if (!response.text) throw new Error("No response from AI model.");
        
        const data = JSON.parse(response.text) as ExtractedData;
        
        // Post-processing safety
        if (!data.documentText && input.pdfText) {
            data.documentText = input.pdfText;
        }

        return data;

    } catch (error) {
        console.error("Gemini Extraction Error:", error);
        throw error;
    }
};
