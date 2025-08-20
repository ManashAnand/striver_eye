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
  Rows,
  Columns,
  Shuffle,
  Star,
  RefreshCw,
  ToggleLeft,
} from "lucide-react";

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
const CardTitle: FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <h3
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
        title: "Strive AI",
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
          <CardTitle className="flex items-center">
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
  const FullCompilerPanel: FC = () => (
    <Card className="h-full">
      <CardHeader className="flex justify-between items-center">
        <CardTitle className="flex items-center">
          {panels[1].icon} {panels[1].title}
        </CardTitle>
        <PanelMenu panelId="compiler" />
      </CardHeader>
      <CardContent className="p-0">
        <textarea
          className="w-full h-full bg-gray-900 text-white font-mono text-sm p-4 resize-none focus:outline-none"
          defaultValue="console.log('Hello, World!');"
        ></textarea>
      </CardContent>
    </Card>
  );
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
