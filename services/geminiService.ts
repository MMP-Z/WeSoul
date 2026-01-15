import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
  // Accessing environment variable as per instructions
  // The index.html shim ensures process.env exists, but the actual key must come from the environment.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateDailyInsight = async (birthDate: string): Promise<{ text: string, luckyColor: string, luckyNumber: string }> => {
  try {
    const ai = getClient();
    
    // We use gemini-3-flash-preview for fast responses
    const modelId = "gemini-3-flash-preview";
    
    const prompt = `
      You are a mystical, modern, and witty spiritual guide for Gen Z users in Vietnam.
      Based on the birth date: ${birthDate}, provide a "Daily Insight".
      
      Requirements:
      1. Tone: Mysterious but encouraging, trendy (use a bit of Gen Z slang appropriately if fitting Vietnamese context, or just keep it modern), not old-fashioned.
      2. Content: A short forecast for the day focused on vibe and energy.
      3. Language: Vietnamese.
      4. Length: Short, under 60 words for the forecast.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            forecast: {
              type: Type.STRING,
              description: "The short daily horoscope text in Vietnamese."
            },
            luckyColor: {
              type: Type.STRING,
              description: "A lucky color for the day (e.g. 'Xanh Navy', 'Hồng Pastel')."
            },
            luckyNumber: {
              type: Type.STRING,
              description: "A lucky number for the day."
            }
          },
          required: ["forecast", "luckyColor", "luckyNumber"]
        }
      }
    });

    let jsonText = response.text;
    if (!jsonText) throw new Error("No response from Oracle");
    
    // Clean up if the model includes Markdown formatting blocks
    // Using a more robust regex replacement to handle standard markdown code blocks
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    const data = JSON.parse(jsonText);

    return {
      text: data.forecast,
      luckyColor: data.luckyColor,
      luckyNumber: data.luckyNumber
    };

  } catch (error) {
    console.error("Gemini Oracle Error:", error);
    return {
      text: "Vũ trụ đang có chút nhiễu loạn tín hiệu. Hãy hít thở sâu và thử lại sau nhé!",
      luckyColor: "Tím Mộng Mơ",
      luckyNumber: "99"
    };
  }
};