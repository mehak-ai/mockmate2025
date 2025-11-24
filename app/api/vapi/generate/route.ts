import { generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid } = await request.json();

  try {
    // ------------------------
    // Generate Questions
    // ------------------------
    const result = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `
        Prepare questions for a job interview.
        Job role: ${role}
        Experience level: ${level}
        Tech stack: ${techstack}
        Focus on: ${type} (behavioural/technical)
        Number of questions: ${amount}
        
        Return ONLY a valid JSON array of strings like:
        ["Question 1", "Question 2"]
        
        No extra text. No explanations. No formatting except valid JSON.
      `,
    });

    let raw = result.text.trim();

    // ------------------------
    // Ensure valid JSON
    // ------------------------
    // If the model adds ```json ... ```
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();

    // If output is wrapped in quotes, remove them
    if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1);
    }

    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(raw);
    } catch (parseError) {
      console.error("JSON parsing failed. Raw output:", raw);
      return Response.json(
        { success: false, error: "Invalid JSON returned from AI model." },
        { status: 500 }
      );
    }

    // ------------------------
    // Prepare interview object
    // ------------------------
    const interview = {
      role,
      type,
      level,
      techstack: Array.isArray(techstack)
        ? techstack
        : techstack?.split(",").map((t: string) => t.trim()) ?? [],
      questions: parsedQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("interviews").add(interview);

    return Response.json(
      {
        success: true,
        questions: parsedQuestions,
        interviewId: docRef.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error:", error);

    return Response.json(
      {
        success: false,
        error: error.message ?? "Unknown server error",
      },
      { status: 500 }
    );
  }
}
