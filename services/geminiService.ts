
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
                enum: ['SUCCESS', 'SUMMARY_MISMATCHED', 'VERSION_MISMATCHED', 'MATCH_BY_TITLE', 'AUTHOR_MISMATCH', 'CHECK_REQUIRED'],
                description: "The overall status based on ID matching and Author logic."
            },
            message: { type: Type.STRING, description: "A brief reason for the status." },
            idComparison: {
                type: Type.OBJECT,
                properties: {
                    pdfId: { type: Type.STRING, nullable: true },
                    pdfVersion: { type: Type.STRING, nullable: true },
                    htmlId: { type: Type.STRING, nullable: true, description: "ID extracted from HTML Summary" },
                    htmlVersion: { type: Type.STRING, nullable: true },
                    scrapeId: { type: Type.STRING, nullable: true },
                    scrapeVersion: { type: Type.STRING, nullable: true },
                    apiId: { type: Type.STRING, nullable: true },
                    apiVersion: { type: Type.STRING, nullable: true },
                    versionMatch: { type: Type.BOOLEAN }
                },
                required: ["versionMatch"]
            },
            titleComparison: {
                type: Type.OBJECT,
                properties: {
                    pdfTitle: { type: Type.STRING, nullable: true },
                    htmlTitle: { type: Type.STRING, nullable: true },
                    match: { type: Type.BOOLEAN },
                    sourceUsed: { type: Type.STRING, enum: ['HTML', 'PDF'] }
                },
                required: ["match", "sourceUsed"]
            },
            authorComparison: {
                type: Type.OBJECT,
                properties: {
                    match: { type: Type.BOOLEAN },
                    details: { type: Type.STRING },
                    pdfCount: { type: Type.NUMBER },
                    apiCount: { type: Type.NUMBER }
                },
                required: ["match", "details"]
            }
        },
        required: ["status", "message", "idComparison", "titleComparison", "authorComparison"]
    },
    arxivId: { type: Type.STRING, description: "The final validated ArXiv ID with version (e.g. 2501.12345v1)." },
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
                role: { type: Type.STRING, nullable: true },
                alias: { type: Type.STRING, nullable: true }
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
    references: { 
        type: Type.ARRAY, 
        items: { 
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING, description: "The original source text of the reference (e.g. '______, et al.')" },
                fullText: { type: Type.STRING, description: "The fully resolved reference text (e.g. 'Smith, J., et al.')" }
            },
            required: ["text", "fullText"]
        } 
    }
  },
  required: ["verification", "arxivId", "title", "authors", "affiliations", "abstract", "references"]
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const parseContentWithGemini = async (input: MultiFileInput): Promise<ExtractedData> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = 'gemini-3-pro-preview'; 

    const parts: any[] = [];
    
    let contextPrompt = "You are ACE (Apeiro Citation Extractor). Extract metadata adhering strictly to CAR 2.0 Business Rules.\n\n";
    contextPrompt += "--- SUPPORTING DATA ---\n";
    if (input.manualId) contextPrompt += `MANUAL OVERRIDE ID: ${input.manualId}\n`;
    if (input.apiContent) contextPrompt += `API METADATA (Author Name/Sequence Authority for verification, but subject to Scenario 8 rules): ${input.apiContent}\n`;
    if (input.htmlContent) contextPrompt += `HTML LANDING PAGE (Title/Abstract/ID Authority): ${input.htmlContent}\n`;
    if (input.scrapeContent) contextPrompt += `SCRAPE DATA (Critical ID/Version Source): ${input.scrapeContent}\n`;
    contextPrompt += "---------------------------------------------------\n\n";

    if (input.pdfText && input.pdfText.length > 500) {
        contextPrompt += "--- PRIMARY SOURCE (PDF TEXT EXTRACT) ---\n";
        contextPrompt += input.pdfText;
        parts.push({ text: contextPrompt });
    } else if (input.pdfBase64) {
        parts.push({ text: contextPrompt });
        parts.push({
            inlineData: {
                mimeType: "application/pdf",
                data: input.pdfBase64
            }
        });
    } else {
        throw new Error("No PDF content provided.");
    }

    const systemPrompt = `
    Adhere strictly to these CAR 2.0 GUIDELINES and Business Rules for arXiv extraction.
    Your goal is to produce the XML-ready JSON output.

    1. **ARXIV ID & VERSION VERIFICATION**:
       - **GOLDEN RULE**: Base ID AND Version MUST match across PDF, Scrape, and HTML.
       - If Scrape/HTML says "v2" and PDF says "v1" -> Status = 'VERSION_MISMATCHED'.
       - **EXCEPTION**: If PDF has no visible ID, check HTML Title vs PDF Title. If Identical, use HTML ID (Status: 'MATCH_BY_TITLE').

    2. **TITLE EXTRACTION**:
       - **Source Authority**:
         - Generally, **HTML Summary (Landing Page)** is the authority for text content, punctuation, and hyphens.
         - **EXCEPTION**: If HTML contains LaTeX formatting delimiters (e.g., "$/5 x 5 -$" or "$z > 6$") used purely for bold/italics/math styling, and the PDF title is cleaner (e.g., "5 x 5 -GRADED"), treat this as a formatting artifact, NOT a content mismatch. In this specific case, **prefer the PDF Title**.
       - **Mismatch Handling**:
         - Strict check on punctuation: "differential - scope" vs "differential - - scope" -> Use HTML.
         - Formatting check: "$\mu$" vs "μ" -> Use HTML/Unicode.
       - **Cleaning & Replacements**:
         - **Remove**: 'Preprint', 'arXiv', leading/trailing superscripts/subscripts/symbols (e.g., *, †, ‡) that are not part of the meaning.
         - **Keep**: Punctuation (? ! :), essential chemical formulas (H2O).
         - **Replacements**:
           - Complex Equations -> "(Formula presented)"
           - Figures in title -> "(Figure presented)"
           - Tables in title -> "(Table presented)"

    3. **ABSTRACT**:
       - Capture from **PDF** (Primary text source).
       - Include continuations on the same line (e.g., "Code available at...").

    4. **AUTHORS (SCENARIO LOGIC & LINKING)**:
       - **Scenario 1 (Match)**: Use either.
       - **Scenario 2 (API Expands Initial)**: Use **API**.
       - **Scenario 3 (Middle Initial)**: Use **API**.
       - **Scenario 4 (PDF More Complete)**: Use **PDF**.
       - **Scenario 5 (Mismatch)**: Capture both if sequence differs.
       - **Scenario 7 (API Lumps)**: Use **PDF** to split.
       - **Scenario 8 (Garbled API)**: Use **PDF**.
       
       **AFFILIATION LINKING (CRITICAL)**:
       - **Footnote Symbols**: Authors often use symbols (†, ‡, §, ¶, ||, *, #) to link to affiliations at the bottom of the page. You MUST map these non-numeric symbols correctly.
       - **EMAIL HEURISTIC**: If an affiliation text block at the bottom of the page contains an email address (e.g. "Department..., email: author@usc.edu"), and that email belongs to an author, you **MUST** link that author to that affiliation index.
       - **Implied Link**: If the email matches, the affiliation is NOT an orphan.

       **ORCID (CRITICAL)**: 
       - Scan the entire document (footnotes, headers, margin notes) for ORCID identifiers (0000-XXXX-XXXX-XXXX).
       - Look for green icons or footnotes linked to author names.

    5. **EMAIL EXTRACTION RULES (STRICT)**:
       - **Element**: ce:e-address.
       - **Format**: Capture as they appear (e.g. "lastname.firstname@gmail.com"). 
         - **Remove** angle brackets (< >) and trailing periods.
         - **Single @**: Ensure only one '@' symbol.
       - **Obfuscated Emails**: You MUST reconstruct them.
         - "james.spearsat gmail com" -> "james.spears@gmail.com"
         - "jamesspears at g mail dot com" -> "jamesspears@gmail.com"
       - **Numeric Emails**: 
         - Capture numeric emails (e.g., "32122t323@gmail.com") ONLY if they are directly linked to an author.
         - **Mixed Lists**: If mix of valid names and numeric, and length mismatch, **DISCARD** numeric/garbage emails.
       - **Multiple Emails**: Capture only the FIRST or most relevant email per author.

    6. **CORRESPONDENCE LOGIC (CRITICAL)**:
       - **Indicators**: "Corresponding author", "Reprint request to", "All correspondence to", "Contact address", or symbols (*, ✉) explicitly defined.
       - **Address Logic**:
         - **Current/Present Address**: If author has affiliation + "Current Address" + is Corresponding -> Capture "Current Address".
         - **Contact Address**: If specific "Contact Address" differs from affiliation -> Mark it.
         - If Contact Address and Affiliation are identical -> Capture once.

    7. **AFFILIATIONS**:
       - **Location**: Affiliations are often found at the bottom of the first page (footnotes), in the margin, or after the abstract. You MUST scan these areas.
       - **Separation**: If a footnote contains multiple affiliations (e.g., "†Dept A... ‡Dept B..."), split them into distinct affiliation entries.
       - **Funding Text**: Affiliation footnotes often contain funding info (e.g. "Supported by NSF grant #..."). Include this text if it's part of the sentence, but primary goal is the institution.
       - **Deconstruction**: Organizations (Array), AddressPart, City, State (US/CA/AU only), PostalCode, Country, Country Code (ISO 3).
       - **Country Code**: Mandatory ISO 3-letter code.

    8. **KEYWORDS (MANDATORY)**:
       - Scan specifically for "Keywords", "Key words", or "Index Terms" usually located immediately following the Abstract or on the first page.
       - Extract all keywords as a clean array of strings.
       - Remove the label "Keywords" from the extracted text.

    9. **REFERENCES (CAR 2.0 PROTOCOLS)**:
       - **General**: Capture ALL references found.
       - **Structure**: You must capture 'text' (source representation) and 'fullText' (resolved representation).
       - **Multiple References**: 
         - If a single reference line contains multiple citations (e.g., "Kobayashi... (1991); ibid., (1992)..."), SPLIT them into separate entries.
         - Resolve "ibid", "supra", "op. cit.", "loc. cit." in the 'fullText' field if they refer to the immediate previous work.
       - **Incomplete/Underscore References**:
         - If a reference starts with "______" or "____," (indicating same author as previous):
           - 'text': Keep as "______, Miyamoto, A..."
           - 'fullText': Resolve to "Kobayashi, A., Miyamoto, A..." (copy authors from previous ref).
       - **Stealth References**:
         - Split references containing "Cf.", "see", "see also" if they refer to a distinct work with full metadata.
       - **Double References**:
         - If both Roman and Non-Roman versions exist, MERGE them.
       - **Hyperlinks**:
         - Remove hyperlinks/tags linking *within* the file.
         - Capture external links/DOIs in the text but remove trailing URLs if they are just metadata noise.
       - **Cleanup**: 
         - Remove superscript citation numbers from the beginning of the reference text in both fields.
         - Ensure diacritics are preserved.
    
    Output pure JSON matching the schema.
    `;

    // Retry Loop for robustness
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            const response = await ai.models.generateContent({
                model: modelId,
                contents: { parts: parts },
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: "application/json",
                    responseSchema: outputSchema,
                    temperature: 0.1,
                    thinkingConfig: { thinkingBudget: 16000 } // Reserve budget for complex reasoning
                }
            });

            const textOutput = response.text;
            if (!textOutput) {
                // Check if candidates were blocked
                const finishReason = response.candidates?.[0]?.finishReason;
                if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
                    throw new Error(`Gemini blocked response due to ${finishReason}. Content might contain sensitive technical data.`);
                }
                throw new Error("Gemini returned an empty response body.");
            }
            
            const data = JSON.parse(textOutput) as ExtractedData;
            
            if (!data.documentText && input.pdfText) {
                data.documentText = input.pdfText;
            }

            return data;

        } catch (error: any) {
            attempts++;
            
            // Check for 429 Rate Limit
            const isRateLimit = 
                error.status === 429 || 
                error.code === 429 ||
                (error.error && error.error.code === 429) ||
                (error.message && error.message.includes('429'));
            
            if (isRateLimit && attempts < maxAttempts) {
                const waitTime = 5000 * Math.pow(2, attempts - 1) + Math.random() * 2000;
                console.warn(`Rate Limit Hit. Retry ${attempts}/${maxAttempts} in ${Math.round(waitTime)}ms`);
                await delay(waitTime);
                continue;
            }

            // For "No response" specifically or empty text, we retry once more if it wasn't a rate limit
            if (error.message.includes("empty response") && attempts < maxAttempts) {
                console.warn(`Empty response. Retrying ${attempts}/${maxAttempts}...`);
                await delay(2000);
                continue;
            }

            console.error("Gemini Extraction Error:", error);
            throw error;
        }
    }
    throw new Error("Failed to extract data after multiple retries.");
};

export const chatWithDocument = async (history: {role: string, content: string}[], currentContextData: any, userMessage: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = 'gemini-3-pro-preview';

    const systemPrompt = `
    You are the ACE (Apeiro Citation Extractor) AI Assistant.
    You are helping a human operator verify and extract metadata from scientific papers according to CAR 2.0 rules.
    
    You have access to the EXTRACTED DATA (JSON) from the document.
    
    GUIDELINES:
    1. Answer specific questions about the data (e.g., "What is the second author?", "Are there any ID mismatches?").
    2. Explain CAR 2.0 Business Rules if asked (e.g., "How do we handle correspondence?", "What if titles differ?").
    3. Be concise and helpful.
    
    Current Extracted Data Context:
    ${JSON.stringify(currentContextData, null, 2)}
    `;

    const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
    ];

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: contents
        });
        return response.text || "I couldn't generate a response.";
    } catch (error) {
        console.error("Chat Error:", error);
        return "Error connecting to AI Agent.";
    }
};
