import { GoogleGenAI, Type } from "@google/genai";
import type { ParsedFile } from '../types';
import { fileToBase64 } from "../utils/helpers";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. Paragraph parsing will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const codeParsingSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      filename: {
        type: Type.STRING,
        description: 'The full filename with a correct extension (e.g., "index.html", "styles.css", "app.py"). Should be lowercase and contain no spaces.',
      },
      language: {
        type: Type.STRING,
        description: 'The programming language of the code block (e.g., "html", "css", "javascript", "python").',
      },
      code: {
        type: Type.STRING,
        description: 'The complete, raw code content of the file.',
      },
    },
    required: ['filename', 'language', 'code'],
  },
};

export const parseCodeFromText = async (text: string): Promise<ParsedFile[]> => {
  if (!API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert code block parser. Analyze the following text, which contains multiple code snippets for different files. Identify each code block, determine a suitable filename with the correct extension (e.g., index.html, script.js, style.css, app.py), and extract the raw code content. Return the result as a JSON array. Each object in the array should represent a single file. Do not add any introductory text or explanations outside of the JSON structure. Here is the text to parse:
---
${text}
---`,
      config: {
        responseMimeType: "application/json",
        responseSchema: codeParsingSchema,
      },
    });

    const jsonString = response.text.trim();
    const parsedResult = JSON.parse(jsonString);
    
    if (!Array.isArray(parsedResult)) {
        throw new Error("API did not return a valid array.");
    }

    return parsedResult as ParsedFile[];

  } catch (error) {
    console.error("Error parsing code with Gemini:", error);
    throw new Error("Failed to parse code blocks from text. Please check the format and try again.");
  }
};

export const extractCodeFromImage = async (file: File): Promise<string> => {
    if (!API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }

    const base64Data = await fileToBase64(file);

    const imagePart = {
        inlineData: {
            mimeType: file.type,
            data: base64Data,
        },
    };

    const textPart = {
        text: 'You are an expert at analyzing images for code. Extract all code blocks and any relevant text from this image. Structure the output clearly. If there is no code, say so.'
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });
        return response.text;
    } catch (error) {
        console.error("Error extracting code from image with Gemini:", error);
        throw new Error("Failed to extract code from image.");
    }
};
