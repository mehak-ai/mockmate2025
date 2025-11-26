"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";
import { getCurrentUser } from "./auth.action";

/* ============================================================
   1. CREATE FEEDBACK
============================================================ */
export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const response = await generateObject({
      model: google("gemini-2.0-flash-001"),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Be STRICT.
        
        Transcript:
        ${formattedTranscript}

        Score the candidate 0–100 for:
        - Communication Skills
        - Technical Knowledge
        - Problem-Solving
        - Cultural & Role Fit
        - Confidence & Clarity
      `,
      system:
        "You are a professional interviewer analyzing a mock interview. Provide structured, strict scoring.",
    });

    const object = response.object;

    const feedback = {
      interviewId,
      userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    const feedbackRef =
      feedbackId !== undefined
        ? db.collection("feedback").doc(feedbackId)
        : db.collection("feedback").doc();

    await feedbackRef.set(feedback);

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

/* ============================================================
   2. GET INTERVIEW BY ID
============================================================ */
export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();
  return interview.data() as Interview | null;
}

/* ============================================================
   3. GET FEEDBACK BY INTERVIEW ID
============================================================ */
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

/* ============================================================
   4. GET LATEST INTERVIEWS
============================================================ */
export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const snapshot = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
    .filter((i) => i.userId !== userId) as Interview[];
}

/* ============================================================
   5. GET INTERVIEWS BY USER ID
============================================================ */
export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  if (!userId) return [];

  const snapshot = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

/* ============================================================
   6. SAVE INTERVIEW (GEMINI + VAPI)
============================================================ */
export async function saveInterviewToFirestore(interview: any) {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "Not authenticated" };

  const interviewId = interview.id || crypto.randomUUID();

  await db.collection("interviews").doc(interviewId).set({
    id: interviewId,
    userId: user.id,

    role: interview.role ?? "Unknown",
    level: interview.level ?? "Unknown",
    coverImage: interview.coverImage ?? "/covers/default.png",
    techstack: interview.techstack ?? [],
    type: interview.type ?? "generate",
    questions: interview.questions ?? [],

    messages: interview.messages ?? [],

    finalized: true,
    createdAt: new Date().toISOString(),
  });

  return { success: true, interviewId };
}

/* ============================================================
   7. GENERATE INTERVIEW DETAILS (FIXED WITH ZOD)
============================================================ */
export async function generateInterviewDetails(params: any) {
  const { userId, role, level, techstack, amount } = params;

  const InterviewSchema = z.object({
    id: z.string(),
    coverImage: z.string(),
    role: z.string(),
    level: z.string(),
    type: z.string(),
    techstack: z.array(z.string()),
    questions: z.array(z.string()),
  });

  const response = await generateObject({
    model: google("gemini-2.0-flash-001"),
    schema: InterviewSchema,
    prompt: `
      Generate an interview with EXACTLY ${amount} questions.
      Role: ${role}
      Level: ${level}
      Techstack: ${techstack}
    `,
  });

  const object = response.object;

  await db.collection("interviews").doc(object.id).set({
    ...object,
    userId,
    finalized: true,
    createdAt: new Date().toISOString(),
  });

  return object;
}
