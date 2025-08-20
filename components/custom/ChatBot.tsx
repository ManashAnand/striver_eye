"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  FC,
  MouseEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Code,
  Video,
  Sun,
  Moon,
  MoreVertical,
  Send,
  Shuffle,
  Star,
  RefreshCw,
  ToggleLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

type PanelId = "chat" | "compiler" | "video";
type Orientation = "vertical" | "horizontal";
type DragHandle = "main" | "secondary" | null;

interface Panel {
  id: PanelId;
  title: string;
  icon: JSX.Element;
}

interface Message {
  id: number;
  text: string;
  sender: "bot" | "user";
}

interface ChatApiMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatApiResponse {
  ok: boolean;
  assistant_text?: string;
  result?: any;
  raw?: any;
  detail?: string;
}

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// Mock ShadCN UI Components
const Card: FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <motion.div
    layout
    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden flex flex-col ${className}`}
    whileHover={{ borderColor: "rgba(99, 102, 241, 0.5)" }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);

const CardHeader: FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div
    className={`p-4 border-b border-gray-200 dark:border-gray-700 ${className}`}
  >
    {children}
  </div>
);
const CardTitle: FC<{
  className?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLHeadingElement>;
}> = ({ className, children, onClick }) => (
  <h3
    onClick={onClick}
    className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}
  >
    {children}
  </h3>
);
const CardContent: FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => <div className={`p-4 flex-grow ${className}`}>{children}</div>;
const CardFooter: FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div
    className={`p-4 border-t border-gray-200 dark:border-gray-700 ${className}`}
  >
    {children}
  </div>
);

// Markdown renderer for assistant messages
const MarkdownMessage: FC<{ content: string }> = ({ content }) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: any) {
            if (inline) {
              return (
                <code
                  className={`px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-[0.85em] ${className || ""}`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="whitespace-pre-wrap break-words bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto">
                <code className={className || ""} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          p({ children }) {
            return <p className="mb-3 leading-relaxed">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-semibold mb-2">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-semibold mb-2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-semibold mb-2">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 mb-3">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 mb-3">{children}</ol>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

const Button: FC<{
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  [key: string]: any;
}> = ({ className, children, ...props }) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </motion.button>
);

const App: FC<{ problemId?: string }> = ({ problemId }) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [focusedPanelId, setFocusedPanelId] = useState<PanelId>("chat");
  const [mainPanelSize, setMainPanelSize] = useState<number>(66);
  const [secondaryPanelSize, setSecondaryPanelSize] = useState<number>(50);
  const [secondaryOrientation, setSecondaryOrientation] =
    useState<Orientation>("vertical");
  const [draggingHandle, setDraggingHandle] = useState<DragHandle>(null);
  const [secondaryPanelOrder, setSecondaryPanelOrder] = useState<PanelId[]>([
    "compiler",
    "video",
  ]);
  const [activeMenu, setActiveMenu] = useState<PanelId | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const layoutRef = useRef<HTMLDivElement>(null);
  const secondaryContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (
    e: MouseEvent<HTMLDivElement>,
    handle: DragHandle
  ) => {
    e.preventDefault();
    setDraggingHandle(handle);
  };

  const handleMouseUp = useCallback(() => {
    setDraggingHandle(null);
  }, []);

  const handleMouseMove = useCallback(
    (e: globalThis.MouseEvent) => {
      if (!draggingHandle) return;

      if (draggingHandle === "main" && layoutRef.current) {
        const bounds = layoutRef.current.getBoundingClientRect();
        const newSize = ((e.clientX - bounds.left) / bounds.width) * 100;
        if (newSize > 25 && newSize < 75) setMainPanelSize(newSize);
      }

      if (draggingHandle === "secondary" && secondaryContainerRef.current) {
        const bounds = secondaryContainerRef.current.getBoundingClientRect();
        let newSize;
        if (secondaryOrientation === "vertical") {
          newSize = ((e.clientY - bounds.top) / bounds.height) * 100;
        } else {
          newSize = ((e.clientX - bounds.left) / bounds.width) * 100;
        }
        if (newSize > 15 && newSize < 85) setSecondaryPanelSize(newSize);
      }
    },
    [draggingHandle, secondaryOrientation]
  );

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const savedTheme =
      (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const panels: Panel[] = useMemo(
    () => [
      {
        id: "chat",
        title: "Striver AI",
        icon: <MessageSquare className="w-5 h-5 mr-2" />,
      },
      {
        id: "compiler",
        title: "Compiler",
        icon: <Code className="w-5 h-5 mr-2" />,
      },
      {
        id: "video",
        title: "Video Stream",
        icon: <Video className="w-5 h-5 mr-2" />,
      },
    ],
    []
  );

  const cycleLayout = () => {
    const currentIndex = panels.findIndex((p) => p.id === focusedPanelId);
    const nextIndex = (currentIndex + 1) % panels.length;
    setFocusedPanelId(panels[nextIndex].id);
  };

  useEffect(() => {
    setSecondaryPanelOrder(
      panels.filter((p) => p.id !== focusedPanelId).map((p) => p.id)
    );
  }, [focusedPanelId, panels]);

  const getIllustration = async () => {
    console.log("started illustration");
    const res = await fetch("/api/get-illustration?q=search+in+bst");
    const data = await res.json();
    console.log(data);
  };

  const PanelMenu: FC<{ panelId: PanelId }> = ({ panelId }) => {
    const isFocused = panelId === focusedPanelId;
    return (
      <div className="relative">
        <Button
          onClick={() => setActiveMenu(activeMenu === panelId ? null : panelId)}
          size="sm"
          variant="ghost"
          className="p-2 h-8 w-8 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
        <AnimatePresence>
          {activeMenu === panelId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-20"
            >
              {!isFocused && (
                <button
                  onClick={() => {
                    setFocusedPanelId(panelId);
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
                >
                  <Star className="w-4 h-4 mr-2" /> Make Main Panel
                </button>
              )}
                <button
                  onClick={() => {
                   cycleLayout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
                >
                 <ToggleLeft /> Toggle Orientation
                </button>
              {!isFocused && (
                <button
                  onClick={() => {
                    setSecondaryPanelOrder([...secondaryPanelOrder].reverse());
                    setActiveMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center"
                >
                  <Shuffle className="w-4 h-4 mr-2" /> Swap Panels
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const FullChatbotPanel: FC = () => {
    const [messages, setMessages] = useState<Message[]>([
      { id: 1, text: "Hello! How can I help you today?", sender: "bot" },
    ]);
    const [inputValue, setInputValue] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isIllustrating, setIsIllustrating] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [userId, setUserId] = useState<string>("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    useEffect(() => {
      const key = "composio_user_id";
      let uid = localStorage.getItem(key);
      if (!uid) {
        uid = `web-${Math.random().toString(36).slice(2)}-${Date.now()}`;
        localStorage.setItem(key, uid);
      }
      setUserId(uid);
    }, []);

    const callComposioChat = async (allMessages: Message[]): Promise<string> => {
      const formattingSystem: ChatApiMessage = {
        role: "system",
        content:
          "When you include C++ code: 1) Use GitHub-flavored Markdown fenced code blocks with the language identifier cpp, 2) Put the main code block before explanations, 3) Keep explanations concise (bullets preferred), 4) Avoid extra prose and avoid nesting code fences inside quotes, 5) Ensure snippets are compilable where possible.",
      };
      const systemContext: ChatApiMessage[] = problemId
        ? [
            {
              role: "system",
              content: `Page context: problemId=${problemId}. If the user asks about the current question or references the page id, call the get_problem_by_id tool with { id: ${Number(
                problemId
              )} } to fetch details, then answer using that data.`,
            },
          ]
        : [];
      const userAssistantMsgs: ChatApiMessage[] = allMessages.map((m) => ({
        role: m.sender === "bot" ? "assistant" : "user",
        content: m.text,
      }));
      const payloadMessages = [formattingSystem, ...systemContext, ...userAssistantMsgs];
      const res = await fetch("/api/tools/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId || "web-anon",
          messages: payloadMessages,
          toolkits: ["HACKERNEWS"],
          // model: "gpt-4o", // optional; rely on backend default
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }
      const data: ChatApiResponse = await res.json();
      if (!data.ok) {
        throw new Error(data.detail || "Unknown error");
      }
      return data.assistant_text || "";
    };
    const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed || isLoading) return;
      setError("");
      const userMsg: Message = { id: Date.now(), text: trimmed, sender: "user" };
      const optimistic = [...messages, userMsg];
      setMessages(optimistic);
      setInputValue("");
      setIsLoading(true);
      try {
        const assistantText = await callComposioChat(optimistic);
        const botMsg: Message = {
          id: Date.now() + 1,
          text: assistantText || "",
          sender: "bot",
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch (err: any) {
        setError(err?.message || "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    const handleGenerateIllustration = async () => {
      if (!problemId || isIllustrating) return;
      setError("");
      setIsIllustrating(true);
      try {
        const res = await fetch(`/api/get-illustration-by-id?id=${Number(problemId)}&render=true`);
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `HTTP ${res.status}`);
        }
        const data: any = await res.json();
        const parts: string[] = [];
        if (data.video_url) {
          setVideoUrl(data.video_url);
          setFocusedPanelId("video");
          parts.push(`[Illustration video](${data.video_url})`);
        }
        if (data.warning) {
          parts.push(`Warning: ${data.warning}`);
        }
        if (data.render_error) {
          parts.push(`Render error: ${data.render_error}`);
        }
        if (data.code) {
          parts.push("```python\n" + data.code + "\n```");
        }
        const text = parts.join("\n\n");
        const botMsg: Message = { id: Date.now(), text, sender: "bot" };
        setMessages((prev) => [...prev, botMsg]);
      } catch (e: any) {
        setError(e?.message || "Failed to generate illustration");
      } finally {
        setIsIllustrating(false);
      }
    };
    return (
      <Card className="h-full">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="flex items-center cursor-pointer" onClick={() => {
            router.push("/");
          }}>
            {panels[0].icon} {panels[0].title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {problemId && (
              <Button
                onClick={handleGenerateIllustration}
                disabled={isIllustrating}
                className="h-8 px-3 py-1 text-xs"
                title="Generate a Manim illustration for this problem"
              >
                {isIllustrating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-1" /> Generating
                  </>
                ) : (
                  <>Generate Illustration</>
                )}
              </Button>
            )}
            <PanelMenu panelId="chat" />
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto">
          <motion.div
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                variants={itemVariants}
                className={`flex items-start gap-2.5 ${
                  msg.sender === "user" ? "justify-end" : ""
                }`}
              >
                <div
                  className={`flex flex-col w-full max-w-[320px] leading-1.5 p-4 border-gray-200 ${
                    msg.sender === "user"
                      ? "bg-indigo-500 text-white rounded-s-xl rounded-ee-xl dark:bg-indigo-600"
                      : "bg-gray-100 rounded-e-xl rounded-es-xl dark:bg-gray-700"
                  }`}
                >
                  {msg.sender === "bot" ? (
                    <MarkdownMessage content={msg.text} />
                  ) : (
                    <p className="text-sm font-normal">{msg.text}</p>
                  )}
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </motion.div>
        </CardContent>
        <CardFooter>
          <form
            onSubmit={handleSendMessage}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              disabled={isLoading}
              className="w-full p-2 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
            <Button type="submit" disabled={!inputValue.trim() || isLoading} className="p-2">
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
          {error && (
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </CardFooter>
      </Card>
    );
  };
  const FullCompilerPanel: FC = () => {
    const [ciUserId, setCiUserId] = useState<string>("");
    const PY_TPL = "# Python\nprint('Hello from Codeinterpreter')\n";
    const CPP_TPL = `#include <iostream>\nusing namespace std;\nint main(){\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  cout << "Hello from C++\\n";\n  return 0;\n}\n`;
    const [lang, setLang] = useState<"python" | "cpp">("python");
    const [codeInput, setCodeInput] = useState<string>(PY_TPL);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [resultText, setResultText] = useState<string>("");

    useEffect(() => {
      const key = "composio_user_id";
      let uid = localStorage.getItem(key);
      if (!uid) {
        uid = `web-${Math.random().toString(36).slice(2)}-${Date.now()}`;
        localStorage.setItem(key, uid);
      }
      setCiUserId(uid);
    }, []);

    useEffect(() => {
      setCodeInput(lang === "python" ? PY_TPL : CPP_TPL);
    }, [lang]);

    const runInCodeInterpreter = async () => {
      if (isRunning) return;
      setIsRunning(true);
      setResultText("");
      try {
        if (lang === "cpp") {
          try {
            const res = await fetch("/api/compile-run-cpp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: codeInput }),
            });
            if (res.ok) {
              const data = await res.json();
              const out = (data?.stdout || "").trim();
              const err = (data?.stderr || "").trim();
              if (out || err) {
                setResultText(out || err);
                return; // we got a local result
              }
              // if compiler not found, fall through to CI tools path
              if (String(data?.stderr || "").toLowerCase().includes("compiler not found")) {
                // proceed to CI tool path below
              } else {
                // unknown case, still show whatever text we have
                setResultText(out || err || "");
                return;
              }
            }
          } catch (_) {
            // fallback to CI tools path
          }
        }

        const systemMsg =
          lang === "python"
            ? "You are connected to Composio's Codeinterpreter toolkit. Execute the provided Python code in a sandbox and return stdout, stderr, and any file outputs. Prefer saving charts/images to files under /home/user and report their paths."
            : [
                "You are connected to Composio's Codeinterpreter toolkit. You MUST only use tools to compile and run C++.",
                "Follow exactly:",
                "1) CODEINTERPRETER_CREATE_SANDBOX (keep_alive=300) -> capture sandbox_id",
                "2) CODEINTERPRETER_UPLOAD_FILE_CMD (destination_path='/home/user/main.cpp', file=<content of code>, overwrite=true, sandbox_id=<sandbox_id>)",
                "3) CODEINTERPRETER_RUN_TERMINAL_CMD (command='g++ -std=c++17 -O2 -o /home/user/main /home/user/main.cpp', sandbox_id=<sandbox_id>, timeout=60)",
                "4) CODEINTERPRETER_RUN_TERMINAL_CMD (command='/home/user/main', sandbox_id=<sandbox_id>, timeout=60)",
                "Return only the stdout produced by step 4 (the backend will parse tool outputs). Do not add any explanations in assistant content.",
              ].join("\n");

        const userMsg =
          lang === "python"
            ? `Run this code:\n\n\`\`\`python\n${codeInput}\n\`\`\``
            : [
                "C++ source to compile and run:",
                "\n\n```cpp",
                codeInput,
                "```\n",
                "Use only tools as instructed in system message.",
              ].join("");

        const messages = [
          { role: "system", content: systemMsg },
          { role: "user", content: userMsg },
        ];
        const res = await fetch("/api/tools/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: ciUserId || "web-ci-anon",
            messages,
            toolkits: ["CODEINTERPRETER"],
            model: "gpt-4o",
          }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const result: any = data?.result;

        const stdoutParts: string[] = [];
        const stderrParts: string[] = [];

        const collect = (node: any) => {
          if (node == null) return;
          if (Array.isArray(node)) {
            for (const x of node) collect(x);
            return;
          }
          if (typeof node === "object") {
            for (const [k, v] of Object.entries(node)) {
              const key = k.toLowerCase();
              if (key === "stdout" && typeof v === "string") stdoutParts.push(v);
              if ((key === "stderr" || key === "error") && typeof v === "string") stderrParts.push(v);
              collect(v);
            }
            return;
          }
        };

        collect(result);

        // Prefer last non-empty stdout; else show last stderr/error
        let finalOut = stdoutParts.filter(Boolean).pop()?.trim() || "";
        if (!finalOut) finalOut = stderrParts.filter(Boolean).pop()?.trim() || "";
        if (!finalOut) finalOut = (data?.assistant_text || "").trim();

        setResultText(finalOut || "");
      } catch (err: any) {
        setResultText(err?.message || "Failed to run in Codeinterpreter");
      } finally {
        setIsRunning(false);
      }
    };

    return (
      <Card className="h-full">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            {panels[1].icon} Codeinterpreter
          </CardTitle>
          <PanelMenu panelId="compiler" />
        </CardHeader>
        <CardContent className="p-0 grid grid-rows-2 h-full">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 uppercase">{lang} Code</span>
              <div className="flex gap-2">
                <select
                  className="h-8 px-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as any)}
                >
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                </select>
                <Button onClick={runInCodeInterpreter} disabled={isRunning} className="py-1 px-3 h-8">
                  {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Run in Codeinterpreter"}
                </Button>
              </div>
            </div>
            <textarea
              className="w-full h-40 bg-gray-900 text-white font-mono text-sm p-3 rounded resize-none focus:outline-none"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="p-3 overflow-auto">
            <span className="block text-xs text-gray-500 mb-2">Result</span>
            <pre className="whitespace-pre-wrap break-words text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded">
{resultText || "No output yet."}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  };
  const FullVideoPanel: FC = () => (
    <Card className="h-full">
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="flex items-center">
          {panels[2].icon} {panels[2].title}
        </CardTitle>
        <PanelMenu panelId="video" />
      </CardHeader>
      <CardContent className="bg-black flex items-center justify-center p-0">
        {videoUrl ? (
          <video
            key={videoUrl}
            className="w-full h-auto max-h-full"
            controls
            playsInline
            src={videoUrl}
          />
        ) : (
          <div className="text-gray-400 p-6 text-sm">No video yet. Generate one from the chat panel.</div>
        )}
      </CardContent>
    </Card>
  );
  const fullPanelComponents: Record<PanelId, JSX.Element> = {
    chat: <FullChatbotPanel />,
    compiler: <FullCompilerPanel />,
    video: <FullVideoPanel />,
  };

  return (
    <div className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-300 font-sans overflow-hidden">
    
      <main className="p-4 h-[calc(100vh)]">
        <div ref={layoutRef} className="flex h-full w-full">
          <motion.div
            className="h-full pr-1"
            style={{ width: `${mainPanelSize}%` }}
            animate={{ width: `${mainPanelSize}%` }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={focusedPanelId}
                className="h-full w-full"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                {fullPanelComponents[focusedPanelId]}
              </motion.div>
            </AnimatePresence>
          </motion.div>
          <div
            onMouseDown={(e) => handleMouseDown(e, "main")}
            className="w-2 cursor-col-resize bg-gray-300 dark:bg-gray-600 hover:bg-indigo-500 transition-colors rounded flex items-center justify-center"
          ></div>
          <motion.div
            ref={secondaryContainerRef}
            className={`h-full pl-1 flex gap-2 ${
              secondaryOrientation === "vertical" ? "flex-col" : "flex-row"
            }`}
            style={{ width: `${100 - mainPanelSize}%` }}
            animate={{ width: `${100 - mainPanelSize}%` }}
          >
            <motion.div
              className="relative"
              style={
                secondaryOrientation === "vertical"
                  ? { height: `${secondaryPanelSize}%` }
                  : { width: `${secondaryPanelSize}%` }
              }
              animate={
                secondaryOrientation === "vertical"
                  ? { height: `${secondaryPanelSize}%` }
                  : { width: `${secondaryPanelSize}%` }
              }
            >
              {fullPanelComponents[secondaryPanelOrder[0]]}
            </motion.div>
            <div
              onMouseDown={(e) => handleMouseDown(e, "secondary")}
              className={` ${
                secondaryOrientation === "vertical"
                  ? "h-2 w-full cursor-row-resize"
                  : "w-2 h-full cursor-col-resize"
              } bg-gray-300 dark:bg-gray-600 hover:bg-indigo-500 transition-colors rounded`}
            ></div>
            <motion.div
              className="relative"
              style={
                secondaryOrientation === "vertical"
                  ? { height: `${100 - secondaryPanelSize}%` }
                  : { width: `${100 - secondaryPanelSize}%` }
              }
              animate={
                secondaryOrientation === "vertical"
                  ? { height: `${100 - secondaryPanelSize}%` }
                  : { width: `${100 - secondaryPanelSize}%` }
              }
            >
              {fullPanelComponents[secondaryPanelOrder[1]]}
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default App;
