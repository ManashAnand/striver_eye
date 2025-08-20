"use client";
import Question from "@/components/custom/Question";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  interface QuestionType {
    id: number;
    title: string;
    difficulty: string;
    question: string;
    markdown: string;
    created_at: string;
  }

  interface QuestionWhole extends Array<QuestionType> {}

  const [questions, setQuestions] = useState<QuestionWhole>([
    {
      id: 0,
      question: "",
      markdown: "",
      difficulty: "",
      title: "",
      created_at: "",
    },
  ]);
  const router = useRouter();
  useEffect(() => {
    const fn = async () => {
      const data = await fetch("/api/ping-db");
      // const data = await fetch("http://localhost:8000/");
      const res = await data.json();
      setQuestions(res);
      console.log("it works");
      console.log(res);
    };

    fn();
  }, []);

  return (
    <>
      <div className="min-h-screen w-full bg-black relative">
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `
          radial-gradient(circle at 50% 100%, rgba(70, 85, 110, 0.5) 0%, transparent 60%),
          radial-gradient(circle at 50% 100%, rgba(99, 102, 241, 0.4) 0%, transparent 70%),
          radial-gradient(circle at 50% 100%, rgba(181, 184, 208, 0.3) 0%, transparent 80%)
        `,
          }}
        />
        {/* <div className="relative z-10">
          {questions?.map((item, index) => {
            return (
              <div
                key={index} // Use a unique ID if available, otherwise fall back
                className="w-full m-4 p-2 bg-white text-black cursor-pointer rounded-md"
                onClick={() => router.push(`/chatbot/${item.question}`)}
              >
                {item.question}
              </div>
            );
          })}
        </div> */}
        <div className="relative z-10">
          <Question questions={questions} />
        </div>
        </div>
    </>
  );
}
