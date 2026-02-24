import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid } = await request.json();

  try {
    // ------------------------
    // STEP 1: Generate Questions with Gemini
    // ------------------------
    const geminiResult = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `
        Prepare interview questions.

        Job role: ${role}
        Experience level: ${level}
        Tech stack: ${techstack}
        Question Type: ${type}
        Number of questions: ${amount}

        ONLY return valid JSON:
        ["Question 1", "Question 2", ...]
      `,
    });

    let rawQuestions = geminiResult.text.trim();

    // Clean up JSON fences
    rawQuestions = rawQuestions.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsedQuestions: string[] = [];
    try {
      parsedQuestions = JSON.parse(rawQuestions);
    } catch (err) {
      console.error("Failed to parse JSON:", rawQuestions);
      return Response.json(
        { success: false, error: "Gemini returned invalid JSON." },
        { status: 500 }
      );
    }

    // ------------------------
    // STEP 2: Directly Prepare Interview Object
    // ------------------------
    const interview = {
      role,
      type,
      level,
      techstack: Array.isArray(techstack)
        ? techstack
        : techstack
        ? techstack.split(",").map((t: string) => t.trim())
        : [],
      questions: parsedQuestions,
      variables: { role, type, level, techstack, amount }, // Store variables directly
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    // ------------------------
    // STEP 3: Save in Firestore
    // ------------------------
    const docRef = await db.collection("interviews").add(interview);

    // ------------------------
    // STEP 4: Send Response
    // ------------------------
    return Response.json(
      {
        success: true,
        interviewId: docRef.id,
        questions: parsedQuestions,
        variables: interview.variables,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Server Error:", error);
    return Response.json(
      {
        success: false,
        error: error.message ?? "Unknown server error",
      },
      { status: 500 }
    );
  }
}
