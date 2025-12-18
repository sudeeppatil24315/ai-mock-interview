export const runtime = "nodejs";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { formattedTranscript } = await request.json();
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google AI API key is not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
    });

    const prompt = `You are a professional interviewer analyzing a mock interview. Evaluate the candidate based on structured categories.

Transcript:
${formattedTranscript}

Provide a JSON response with this structure:
{
  "totalScore": <number 0-100>,
  "categoryScores": [
    { "name": "Communication Skills", "score": <0-100>, "comment": "<detailed comment>" },
    { "name": "Technical Knowledge", "score": <0-100>, "comment": "<detailed comment>" },
    { "name": "Problem Solving", "score": <0-100>, "comment": "<detailed comment>" },
    { "name": "Cultural Fit", "score": <0-100>, "comment": "<detailed comment>" },
    { "name": "Confidence and Clarity", "score": <0-100>, "comment": "<detailed comment>" }
  ],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "areasForImprovement": ["<area 1>", "<area 2>", "<area 3>"],
  "finalAssessment": "<comprehensive assessment>"
}

Return ONLY the JSON object.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }
    
    const feedbackData = JSON.parse(jsonMatch[0]);
    return NextResponse.json(feedbackData);
    
  } catch (error) {
    console.error("[API] Error generating feedback:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
