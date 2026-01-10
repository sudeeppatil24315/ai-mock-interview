export const runtime = "nodejs";

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

    // Use gemini-2.0-flash-exp (works, just has rate limits)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[API] Gemini API error:", errorData);
      return NextResponse.json(
        { error: `Gemini API error: ${JSON.stringify(errorData)}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return NextResponse.json(
        { error: "No response from Gemini API" },
        { status: 500 }
      );
    }
    
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
