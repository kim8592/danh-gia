
import { GoogleGenAI, Type } from "@google/genai";
import { TeacherAdvice } from "../types";

// Fix: Always initialize GoogleGenAI using process.env.API_KEY directly as a named parameter
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateEvaluationComment(
  subject: string,
  level: string,
  note: string,
  aiPrompt: string
): Promise<string> {
  const model = "gemini-3-flash-preview";
  const systemInstruction = `
    Bạn là giáo viên tiểu học tại Việt Nam. Viết nhận xét học bạ theo Thông tư 27.
    QUY TẮC: 
    1. Bắt đầu bằng từ "Em". 
    2. Nếu mức đạt là T (Tốt): Khen ngợi thành tích xuất sắc và sự tích cực.
    3. Nếu mức đạt là Đ hoặc H (Hoàn thành): Khen ngợi điểm mạnh + nhắc nhở nhẹ nhàng hướng phát triển.
    4. Nếu mức đạt là C (Cần cố gắng): Khen ngợi nỗ lực + nêu cụ thể hạn chế + hướng khắc phục kịp thời.
    5. Tích hợp Lưu ý chung và Ghi chú riêng của giáo viên. 
    6. Trả về đúng 1 câu duy nhất, ngắn gọn, súc tích, giàu tình cảm sư phạm.
  `;

  const prompt = `
    Môn học/Nội dung: ${subject}
    Mức đạt: ${level}
    Ghi chú cá nhân: ${note || "Không có ghi chú cụ thể"}
    Yêu cầu bổ sung từ giáo viên: ${aiPrompt || "Không có yêu cầu đặc biệt"}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    // Fix: Extract generated text directly from the .text property of GenerateContentResponse
    return response.text?.trim().replace(/[*\-#"']/g, '') || "";
  } catch (error) {
    console.error("Gemini Comment Error:", error);
    return "";
  }
}

export async function getPedagogicalAdvice(
  contextType: string,
  subject: string,
  level: string,
  note: string
): Promise<TeacherAdvice | null> {
  // Fix: Upgrade to gemini-3-pro-preview for complex text tasks involving pedagogical reasoning
  const model = "gemini-3-pro-preview";
  
  const prompt = `
    Dưới vai trò là một chuyên gia giáo dục tiểu học tại Việt Nam, hãy đưa ra tư vấn sư phạm ngắn gọn cho học sinh đang học ${contextType}: ${subject}.
    Thông tin hiện tại:
    - Mức độ đạt được: ${level}
    - Ghi chú giáo viên: ${note || "Không có"}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teacherAdvice: {
              type: Type.STRING,
              description: "Lời khuyên ngắn gọn cho giáo viên để hỗ trợ học sinh này."
            },
            studentAdvice: {
              type: Type.STRING,
              description: "Lời nhắn khích lệ hoặc hướng dẫn trực tiếp cho học sinh (hoặc phụ huynh)."
            }
          },
          required: ["teacherAdvice", "studentAdvice"]
        }
      }
    });

    // Fix: Access .text property directly and safely parse the JSON response
    const jsonStr = response.text?.trim();
    if (!jsonStr) return null;
    return JSON.parse(jsonStr) as TeacherAdvice;
  } catch (error) {
    console.error("Gemini Advice Error:", error);
    return null;
  }
}
