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
            text: "请识别这张图片中的植物并提供详细的养护说明。请使用中文返回 JSON 格式的数据。",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "植物名称" },
          scientificName: { type: Type.STRING, description: "学名" },
          confidence: { type: Type.NUMBER, description: "识别置信度" },
          description: { type: Type.STRING, description: "植物描述" },
          careInstructions: {
            type: Type.OBJECT,
            properties: {
              watering: { type: Type.STRING, description: "浇水建议" },
              light: { type: Type.STRING, description: "光照要求" },
              soil: { type: Type.STRING, description: "土壤要求" },
              temperature: { type: Type.STRING, description: "温度要求" },
              humidity: { type: Type.STRING, description: "湿度要求" },
              fertilizing: { type: Type.STRING, description: "施肥建议" },
            },
            required: ["watering", "light", "soil", "temperature", "humidity", "fertilizing"],
          },
          commonIssues: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "常见问题"
          },
          funFact: { type: Type.STRING, description: "趣味小知识" },
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
      systemInstruction: "你是一位名叫 Flora 的专业园艺助手。你乐于助人、友善，并且精通各种植物、园艺技术和病虫害防治。请用中文回答，保持简洁但富有信息量。使用 markdown 格式。",
    },
    history: history,
  });

  const result = await chat.sendMessageStream({ message });
  for await (const chunk of result) {
    yield chunk.text;
  }
}
