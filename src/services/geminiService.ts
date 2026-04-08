import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface PlantInfo {
  name: string;
  scientificName: string;
  confidence: number;
  description: string;
  careInstructions: {
    watering: string;
    light: string;
    soil: string;
    temperature: string;
    humidity: string;
    fertilizing: string;
  };
  commonIssues: string[];
  funFact: string;
}

export async function identifyPlant(base64Image: string, mimeType: string): Promise<PlantInfo> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: "Identify this plant and provide detailed care instructions. Return the data in JSON format.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          scientificName: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          description: { type: Type.STRING },
          careInstructions: {
            type: Type.OBJECT,
            properties: {
              watering: { type: Type.STRING },
              light: { type: Type.STRING },
              soil: { type: Type.STRING },
              temperature: { type: Type.STRING },
              humidity: { type: Type.STRING },
              fertilizing: { type: Type.STRING },
            },
            required: ["watering", "light", "soil", "temperature", "humidity", "fertilizing"],
          },
          commonIssues: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          funFact: { type: Type.STRING },
        },
        required: ["name", "scientificName", "confidence", "description", "careInstructions", "commonIssues", "funFact"],
      },
    },
  });

  return JSON.parse(response.text);
}

export async function* chatWithAssistant(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are Flora, an expert gardening assistant. You are helpful, friendly, and knowledgeable about all types of plants, gardening techniques, and pest control. Keep your answers concise but informative. Use markdown for formatting.",
    },
    history: history,
  });

  const result = await chat.sendMessageStream({ message });
  for await (const chunk of result) {
    yield chunk.text;
  }
}
