"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { createFeedback, saveInterviewTranscript } from "@/lib/actions/general.action";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

interface AgentProps {
  userName: string;
  userId: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  role?: string;
  level?: string;
  techstack?: string[] | string;
  amount?: number;
  questions?: string[];
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  role,
  level,
  techstack,
  amount,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState("");
  const [userInput, setUserInput] = useState("");

  // ---------------------- VAPI Event Handlers ----------------------
  useEffect(() => {
    const onCallStart = () => setCallStatus(CallStatus.ACTIVE);
    const onCallEnd = () => setCallStatus(CallStatus.FINISHED);

    const onMessage = (message: any) => {
      // Voice transcript
      if (message.type === "transcript" && message.transcriptType === "final") {
        setMessages((prev) => [
          ...prev,
          { role: message.role, content: message.transcript },
        ]);
      }

      // Assistant responses
      if (message.type === "response" && message.message?.text) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: message.message.text },
        ]);
      }
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);

    // Robust error logging
    const onError = (error: any) => {
      if (!error) {
        console.error("VAPI Error: unknown error (empty object)");
      } else if (error instanceof Error) {
        console.error("VAPI Error:", error.message, error.stack);
      } else if (typeof error === "object") {
        console.error("VAPI Error (object):", JSON.stringify(error));
      } else {
        console.error("VAPI Error:", error);
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  // ---------------------- Handle Transcript & Feedback ----------------------
  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const saveFeedback = async () => {
      // Save transcript for later viewing
      if (interviewId) {
        await saveInterviewTranscript({
          interviewId: interviewId!,
          userId: userId!,
          transcript: messages,
        });
      }

      const { success, feedbackId: newId } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && newId) router.push(`/interview/${interviewId}/feedback`);
      else router.push("/");
    };


    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") router.push("/");
      else saveFeedback();
    }
  }, [messages, callStatus]);

  // ---------------------- Start Call ----------------------
  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    const workflowId = "fffd3b52-1d62-40ca-99b7-a32d0c89b2e2";

    const variableValues: any = {
      username: userName,
      userid: userId,
      role: role || "",
      type: type || "",
      level: level || "",
      techstack: Array.isArray(techstack) ? techstack.join(", ") : techstack || "",
      amount: amount || 0,
    };

    if (type !== "generate" && questions && questions.length > 0) {
      variableValues.questions = questions.map((q) => `- ${q}`).join("\n");
    }

    try {
      await vapi.start(workflowId, { variableValues });
    } catch (error) {
      console.error("VAPI start error:", error);
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  // ---------------------- End Call ----------------------
  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  // ---------------------- Send Text Input to VAPI ----------------------
  const sendText = () => {
    if (!userInput.trim()) return;

    // Show user input in transcript
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userInput },
    ]);

    // Send to VAPI so assistant can respond
    vapi.send({
      type: "add-message",
      message: {
        role: "user",
        content: userInput,
      },
    });

    setUserInput("");
  };

  const handleEnter = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={120}
              height={120}
              className="rounded-full object-cover"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p key={lastMessage} className={cn("animate-fadeIn")}>
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      {/* Text input for user */}
      {callStatus === CallStatus.ACTIVE && (
        <div className="w-full flex flex-col items-center mt-4 gap-3">
          <input
            className="w-[80%] p-3 border rounded-xl text-black"
            placeholder="Type your response and press Enter..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleEnter}
          />
          <button
            onClick={sendText}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg"
          >
            Send
          </button>
        </div>
      )}

      <div className="w-full flex justify-center mt-4">
        {callStatus !== CallStatus.ACTIVE ? (
          <button className="relative btn-call" onClick={handleCall}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />
            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
