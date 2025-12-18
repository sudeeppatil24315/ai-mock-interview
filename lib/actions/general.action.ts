"use server";

import { db } from "@/firebase/admin";

export async function createFeedback(params: CreateFeedbackParams) {
  console.log("[SERVER] createFeedback called with params:", {
    interviewId: params.interviewId,
    userId: params.userId,
    transcriptLength: params.transcript?.length,
    feedbackId: params.feedbackId
  });

  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    // Validate Google API key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    console.log("[SERVER] API Key check:", apiKey ? "Present" : "Missing");
    
    if (!apiKey) {
      console.error("[SERVER] GOOGLE_GENERATIVE_AI_API_KEY is not set");
      return {
        success: false,
        message: "Google AI API key is not configured"
      };
    }

    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    // Check if there's meaningful user participation
    const userMessages = transcript.filter(msg => msg.role === "user");
    const hasMinimalParticipation = userMessages.length <= 1;
    
    // If user barely participated, assign a very low score
    if (hasMinimalParticipation) {
      const feedback = {
        interviewId: interviewId,
        userId: userId,
        totalScore: 1, // Very low score for non-participation
        categoryScores: [
          { name: "Communication Skills", score: 1, comment: "The candidate provided minimal or no responses during the interview." },
          { name: "Technical Knowledge", score: 1, comment: "Unable to assess technical knowledge due to lack of participation." },
          { name: "Problem Solving", score: 1, comment: "Unable to assess problem-solving skills due to lack of participation." },
          { name: "Cultural Fit", score: 1, comment: "Minimal interaction makes it difficult to assess cultural fit." },
          { name: "Confidence and Clarity", score: 1, comment: "The candidate did not engage sufficiently to demonstrate confidence or clarity." }
        ],
        strengths: ["No strengths identified due to limited participation."],
        areasForImprovement: [
          "Active participation in the interview process",
          "Providing detailed responses to questions",
          "Completing the full interview to allow proper assessment"
        ],
        finalAssessment: "The interview was ended prematurely with minimal or no participation from the candidate. A proper assessment could not be made due to insufficient interaction. We recommend retaking the interview with full engagement to receive meaningful feedback.",
        createdAt: new Date().toISOString(),
      };

      let feedbackRef;
      if (feedbackId) {
        feedbackRef = db.collection("feedback").doc(feedbackId);
      } else {
        feedbackRef = db.collection("feedback").doc();
      }
      await feedbackRef.set(feedback);
      console.log("[SERVER] Minimal participation feedback saved:", feedbackRef.id);
      return { success: true, feedbackId: feedbackRef.id };
    }

    // Normal AI-based assessment for users who participated
    console.log("[SERVER] Generating AI feedback via API route...");
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/generate-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ formattedTranscript }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const object = await response.json();

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    let feedbackRef;

    if (feedbackId) {
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      feedbackRef = db.collection("feedback").doc();
    }

    await feedbackRef.set(feedback);
    console.log("[SERVER] AI-generated feedback saved:", feedbackRef.id);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("[SERVER] Error saving feedback:", error);
    console.error("[SERVER] Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      error
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to save feedback';
    console.error("[SERVER] Returning error response:", { success: false, message: errorMessage });
    
    return { 
      success: false, 
      message: errorMessage
    };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  // Use environment variable with fallback to 200 if not provided
  const defaultLimit = Number(process.env.NEXT_PUBLIC_MAX_INTERVIEWS) || 200;
  const { userId, limit = defaultLimit } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function deleteInterview(params: { interviewId: string; userId: string }) {
  const { interviewId, userId } = params;

  try {
    // Get the interview to verify ownership
    const interviewDoc = await db.collection("interviews").doc(interviewId).get();
    
    if (!interviewDoc.exists) {
      return { success: false, message: "Interview not found" };
    }

    const interviewData = interviewDoc.data();
    
    // Verify the user owns this interview
    if (interviewData?.userId !== userId) {
      return { success: false, message: "Unauthorized to delete this interview" };
    }

    // Delete associated feedback
    const feedbackSnapshot = await db
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .get();

    const batch = db.batch();
    feedbackSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the interview
    batch.delete(db.collection("interviews").doc(interviewId));

    await batch.commit();

    return { success: true, message: "Interview deleted successfully" };
  } catch (error) {
    console.error("Error deleting interview:", error);
    return { success: false, message: "Failed to delete interview" };
  }
}