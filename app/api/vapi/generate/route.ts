import { db } from "@/firebase/admin";
import { getRandomInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  const { type, role, level, techstack, amount, userid } = await request.json();

  try {
    console.log("Generating interview for:", { role, level, techstack, type, amount, userid });

    // Generate sample questions based on the role and tech stack
    const techArray = techstack.split(",").map((t: string) => t.trim());
    const questions = [];

    // Generate questions based on type and tech stack
    if (type === "technical" || type.toLowerCase().includes("technical")) {
      questions.push(`Can you explain your experience with ${role} and how you've applied it in previous projects?`);
      questions.push(`What are the key differences between ${techArray[0] || "JavaScript"} and other similar technologies you've worked with?`);
      questions.push(`Describe a challenging technical problem you solved using ${techArray[1] || techArray[0] || "your tech stack"}.`);
      if (amount >= 4) {
        questions.push(`How do you approach code reviews and ensuring code quality in ${techArray[0] || "your projects"}?`);
      }
      if (amount >= 5) {
        questions.push(`What best practices do you follow when working with ${techArray.join(", ")}?`);
      }
    } else {
      questions.push(`Tell me about a time when you had to work with a difficult team member. How did you handle it?`);
      questions.push(`Describe a situation where you had to meet a tight deadline. What was your approach?`);
      questions.push(`How do you prioritize tasks when working on multiple projects?`);
      if (amount >= 4) {
        questions.push(`Give an example of when you had to adapt to a significant change at work.`);
      }
      if (amount >= 5) {
        questions.push(`Describe a time when you took initiative to improve a process or solve a problem.`);
      }
    }

    // Trim to requested amount
    const finalQuestions = questions.slice(0, amount);

    console.log("Generated questions:", finalQuestions);

    const interview = {
      role: role,
      type: type,
      level: level,
      techstack: techstack.split(",").map((t: string) => t.trim()),
      questions: finalQuestions,
      userId: userid,
      finalized: true,
      coverImage: getRandomInterviewCover(),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return Response.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return Response.json({ success: false, error: error }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}