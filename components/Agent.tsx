"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";
import CallHint from "@/components/CallHint";

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

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  userAvatar,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [showCallHint, setShowCallHint] = useState(true);
  const [lastActivityTimestamp, setLastActivityTimestamp] = useState<number>(Date.now());
  const INACTIVITY_TIMEOUT = process.env.NEXT_PUBLIC_VAPI_INACTIVITY_TIMEOUT 
                            ? parseInt(process.env.NEXT_PUBLIC_VAPI_INACTIVITY_TIMEOUT) 
                            : 10000; // time of inactivity will end the call
  // Add question tracking
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const totalQuestions = questions?.length || 0;

  const handleDisconnect = useCallback(() => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  }, []);
  
  // Inactivity monitor
  useEffect(() => {
    if (callStatus !== CallStatus.ACTIVE) return;
    
    const inactivityTimer = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityTimestamp > INACTIVITY_TIMEOUT) {
        console.log("Inactivity timeout reached, ending call");
        handleDisconnect();
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(inactivityTimer);
  }, [callStatus, lastActivityTimestamp, handleDisconnect, INACTIVITY_TIMEOUT]);
  
  // VAPI event handlers
  useEffect(() => {
    // Store original console.error
    const originalConsoleError = console.error;
    
    // Override console.error to filter out expected VAPI "Meeting has ended" errors
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      // Don't log "Meeting has ended" or "ejection" errors as they're expected when workflow ends
      if (errorMessage.includes('Meeting has ended') || errorMessage.includes('ejection')) {
        console.log('Call ended by VAPI workflow (expected behavior)');
        return;
      }
      // Log all other errors normally
      originalConsoleError.apply(console, args);
    };
    
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
      setLastActivityTimestamp(Date.now());
    };

    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        setLastActivityTimestamp(Date.now());
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
        
        // Track question progress - only increment counter when AI asks a MAIN question
        // We'll use a more sophisticated approach to identify main questions
        if (message.role === "assistant" && 
            totalQuestions > 0 && 
            currentQuestionIndex < totalQuestions) {
          
          // Check if this message contains a question that matches one of our prepared questions
          if (message.transcript.includes("?") && questions) {
            // Try to match this message with one of our prepared questions
            const isMainQuestion = questions.some(question => {
              // Create a simplified version of both texts for comparison (lowercase, no punctuation)
              const simplifiedTranscript = message.transcript.toLowerCase().replace(/[^\w\s]/g, '');
              const simplifiedQuestion = question.toLowerCase().replace(/[^\w\s]/g, '');
              
              // Check if the transcript contains a significant portion of the question
              // This helps match even if the AI rephrases slightly
              return simplifiedTranscript.includes(simplifiedQuestion.substring(0, Math.min(30, simplifiedQuestion.length)));
            });
            
            if (isMainQuestion) {
              setCurrentQuestionIndex(prev => prev + 1);
              console.log(`Question ${currentQuestionIndex + 1}/${totalQuestions} asked (matched with prepared question)`);
            }
          }
        }
        
        // Auto-end call when all questions have been asked AND answered
        // Only consider ending after the last question has been asked
        if (currentQuestionIndex >= totalQuestions && totalQuestions > 0) {
          // Only end the call after the user has responded to the last question
          if (message.role === "user") {
            console.log("All questions completed and user has responded, ending call automatically");
            // Add a longer delay to allow for final exchange and closing remarks
            setTimeout(() => {
              handleDisconnect();
            }, 15000); // 15 second grace period after user's final answer
          }
        }
      }
    };

    const onSpeechStart = () => {
      setLastActivityTimestamp(Date.now()); // Update timestamp when speech starts
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      setIsSpeaking(false);
    };

    const onError = (error: Error) => {
      console.log("VAPI Error:", error);
      
      // More robust error handling for meeting ended errors
      // When VAPI workflow uses endCall, it triggers an error event with "Meeting has ended"
      // This is expected behavior and should be treated as a normal call end
      if (
        (typeof error === 'object' && error !== null) && 
        (
          // Check various possible error message formats
          (error.message && error.message.includes("Meeting has ended")) ||
          (error.message && error.message.includes("ejection")) ||
          (error.toString().includes("Meeting has ended")) ||
          (error.toString().includes("ejection")) ||
          (JSON.stringify(error).includes("Meeting has ended"))
        )
      ) {
        console.log("Call ended by workflow (expected behavior), transitioning to FINISHED state");
        setCallStatus(CallStatus.FINISHED);
        // Don't call vapi.stop() here as the call is already ended
        return; // Exit early to prevent further error handling
      }
      
      // For other errors, show error toast
      console.error("Unexpected VAPI error:", error);
      toast.error("An error occurred during the call. Please try again.");
      setCallStatus(CallStatus.INACTIVE);
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      // Restore original console.error
      console.error = originalConsoleError;
      
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, [currentQuestionIndex, totalQuestions, handleDisconnect, questions]); 

  // Handle messages and call status changes
  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {      
      toast.loading("Generating feedback from your interview...", {
        duration: 5000,
        id: "feedback-toast"
      });

      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        toast.success("Feedback generated successfully!", {
          id: "feedback-toast"
        });
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.log("Error saving feedback");
        toast.error("Failed to generate feedback", {
          id: "feedback-toast"
        });
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        // Extract interview details from the conversation
        const handleGenerateInterview = async () => {
          try {
            // Parse the conversation to extract interview details
            const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n');
            
            // Try to extract details from the conversation
            let role = '';
            let level = '';
            let techstack = '';
            let interviewType = 'technical';
            let amount = 5;
            
            // Look for patterns in the conversation
            messages.forEach(msg => {
              const content = msg.content.toLowerCase();
              
              // Extract role
              if (content.includes('role') || content.includes('position')) {
                const roleMatch = msg.content.match(/(?:role|position)(?:\s+is)?[:\s]+([^.,!?]+)/i);
                if (roleMatch) role = roleMatch[1].trim();
              }
              
              // Extract level
              if (content.includes('level') || content.includes('experience')) {
                if (content.includes('senior')) level = 'Senior';
                else if (content.includes('mid')) level = 'Mid-level';
                else if (content.includes('junior') || content.includes('beginner')) level = 'Junior';
              }
              
              // Extract tech stack
              if (content.includes('tech') || content.includes('stack') || content.includes('technologies')) {
                const techMatch = msg.content.match(/(?:tech|stack|technologies)[:\s]+([^.,!?]+)/i);
                if (techMatch) techstack = techMatch[1].trim();
              }
              
              // Extract type
              if (content.includes('behavioral')) interviewType = 'behavioral';
              else if (content.includes('technical')) interviewType = 'technical';
              
              // Extract amount
              const amountMatch = content.match(/(\d+)\s*(?:questions?)/i);
              if (amountMatch) amount = parseInt(amountMatch[1]);
            });
            
            // If we couldn't extract details, use defaults
            if (!role) role = 'Software Engineer';
            if (!level) level = 'Mid-level';
            if (!techstack) techstack = 'JavaScript,React,Node.js';
            
            console.log('Extracted interview details:', { role, level, techstack, interviewType, amount, userId });
            
            toast.loading("Saving your interview...", {
              id: "generate-toast"
            });
            
            // Call the API to generate and save the interview
            const response = await fetch('/api/vapi/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: interviewType,
                role: role,
                level: level,
                techstack: techstack,
                amount: amount,
                userid: userId
              })
            });
            
            const result = await response.json();
            
            if (result.success) {
              toast.success("Interview generated successfully!", {
                duration: 3000,
                id: "generate-toast"
              });
              router.push("/");
            } else {
              throw new Error('Failed to generate interview');
            }
          } catch (error) {
            console.error('Error generating interview:', error);
            toast.error("Failed to generate interview. Please try again.", {
              id: "generate-toast"
            });
            router.push("/");
          }
        };
        
        handleGenerateInterview();
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    if (type === "generate") {
      toast.loading("Generating your interview questions...", {
        duration: 10000,
        id: "generate-toast"
      });
      
      try {
        console.log("Starting VAPI workflow with ID:", process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID);
        console.log("User data:", { username: userName, userid: userId });
        
        if (!userId) {
          toast.error("User ID is required to generate interview", {
            id: "generate-toast"
          });
          setCallStatus(CallStatus.INACTIVE);
          return;
        }
        
        await vapi.start(
          undefined,
          undefined,
          undefined,
          process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!,
          {
            variableValues: {
              username: userName,
              userid: userId,
            },
          }
        );
      } catch (error) {
        console.error("VAPI start error:", error);
        toast.error("Failed to start interview generation. Please check your VAPI configuration.", {
          id: "generate-toast"
        });
        setCallStatus(CallStatus.INACTIVE);
      }
    } else {
      let formattedQuestions = "";
      if (questions) {
        formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join("\n");
      }

      try {
        await vapi.start(interviewer, {
          variableValues: {
            questions: formattedQuestions,
          },
        });
      } catch (error) {
        console.error("VAPI start error:", error);
        toast.error("Failed to start interview. Please try again.");
        setCallStatus(CallStatus.INACTIVE);
      }
    }
  };

    return (
        <>
        <div className="call-view">
            {/* AI Interviewer Card */}
            <div className="card-interviewer">
                <div className="avatar">
                    <Image src="/ai-avatar-512.png" alt="AI Avatar" width={110} height={110} className="object-cover" />
                    {isSpeaking && <span className="animate-speak" />}
                </div>
                <h3>AI Interviewer</h3>
            </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src={userAvatar || "/user-avatar.jpg"}
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center relative">
        {callStatus === CallStatus.INACTIVE && showCallHint && (
          <CallHint 
            targetId="call-button"
            timeoutDuration={10000}
            text={type === "generate" ? "Click CALL to generate the interview" : "Click CALL to start the interview"}
            onDismiss={() => setShowCallHint(false)}
          />
        )}
        
        {callStatus !== "ACTIVE" ? (
          <button 
            id="call-button" 
            className="relative btn-call" 
            onClick={() => handleCall()}
          >
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : <span className="dots-loading">. . .</span>}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect cursor-pointer" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
