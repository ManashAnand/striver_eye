import React from "react";
import Chat from "@/components/custom/ChatBot";

export default function ChatPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <Chat problemId={params.id} />
    </div>
  );
}
