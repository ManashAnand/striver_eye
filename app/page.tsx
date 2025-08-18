"use client";
import Chatbot from "@/components/custom/ChatBot";
import { ModeToggle } from "@/components/ModeToggle";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const fn = async () => {
      const data = await fetch("/api/ping-db");
      // const data = await fetch("http://localhost:8000/");
      const res = await data.json();
      console.log("it works");
      console.log(res);
    };

    fn();
  }, []);

  return <>hi manash</>;
}
