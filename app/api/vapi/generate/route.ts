import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid } = await request.json();

  try {
    // ------------------------
    // Step 1: Generate Questions with Gemini
    // ------------------------
    const geminiResult = await generateText({
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

    let rawQuestions = geminiResult.text.trim();

    // ------------------------
    // Clean up JSON formatting if needed
    // ------------------------
    rawQuestions = rawQuestions.replace(/```json/g, "").replace(/```/g, "").trim();
    if (rawQuestions.startsWith('"') && rawQuestions.endsWith('"')) {
      rawQuestions = rawQuestions.slice(1, -1);
    }

    let parsedQuestions: string[];
    try {
      parsedQuestions = JSON.parse(rawQuestions);
    } catch (parseError) {
      console.error("JSON parsing failed. Raw output:", rawQuestions);
      return Response.json(
        { success: false, error: "Invalid JSON from Gemini" },
        { status: 500 }
      );
    }

    // ------------------------
    // Step 2: Extract variables using VAPI workflow
    // ------------------------
    const vapiResponse = await fetch(
      `https://vapi.io/workflows/${process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID}/execute`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN}`,
        },
        body: JSON.stringify({
          input: parsedQuestions, // array of questions from Gemini
        }),
      }
    );

    const vapiData = await vapiResponse.json();
    const extractedVariables = vapiData.output ?? []; // adjust if your VAPI workflow returns nested structure

    // ------------------------
    // Step 3: Save interview in Firestore
    // ------------------------
    const interview = {
      role,
      type,
      level,
      techstack: Array.isArray(techstack)
        ? techstack
        : techstack?.split(",").map((t: string) => t.trim()) ?? [],
      questions: parsedQuestions,
      variables: extractedVariables, // store VAPI-extracted info
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("interviews").add(interview);

    // ------------------------
    // Step 4: Return response
    // ------------------------
    return Response.json(
      {
        success: true,
        questions: parsedQuestions,
        variables: extractedVariables,
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
