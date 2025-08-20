"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  BookOpen,
} from "lucide-react";

interface Question {
  id: number;
  title: string;
  difficulty: string;
  question: string;
  markdown: string;
  created_at: string;
}

interface QuestionAccordionProps {
  questions: Question[];
}

const difficultyColors = {
  easy: "bg-green-500/20 text-green-400 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hard: "bg-red-500/20 text-red-400 border-red-500/30",
};

const difficultyProgressColors = {
  easy: "bg-green-500",
  medium: "bg-yellow-500",
  hard: "bg-red-500",
};

export function QuestionAccordion({ questions }: QuestionAccordionProps) {
  console.log(questions);
  const [expandedTopics, setExpandedTopics] = useState<string[]>(["Arrays"]);
  const [expandedDifficulties, setExpandedDifficulties] = useState<string[]>([
    "Arrays-easy",
  ]);

  const toggleTopic = (topic: string) => {
    setExpandedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const toggleDifficulty = (topicDifficulty: string) => {
    setExpandedDifficulties((prev) =>
      prev.includes(topicDifficulty)
        ? prev.filter((d) => d !== topicDifficulty)
        : [...prev, topicDifficulty]
    );
  };

  const groupedByTopic = questions.reduce((acc, question) => {
    if (!acc[question.title]) {
      acc[question.title] = {};
    }
    if (!acc[question.title][question.difficulty]) {
      acc[question.title][question.difficulty] = [];
    }
    acc[question.title][question.difficulty].push(question);
    return acc;
  }, {} as Record<string, Record<string, Question[]>>);

  const difficultyOrder = ["easy", "medium", "hard"];
  const difficultyTotals = { easy: 50, medium: 35, hard: 25 };

  return (
    <div className="space-y-6">
      {Object.entries(groupedByTopic).map(([topic, difficulties]) => {
        const isTopicExpanded = expandedTopics.includes(topic);

        // Calculate topic-level stats
        const topicQuestions = Object.values(difficulties).flat();
        const topicStats = difficultyOrder.reduce((acc, diff) => {
          const count = difficulties[diff]?.length || 0;
          acc[diff] = {
            count,
            total: Math.floor(
              difficultyTotals[diff as keyof typeof difficultyTotals] / 3
            ),
          };
          return acc;
        }, {} as Record<string, { count: number; total: number }>);

        const totalCompleted = Object.values(topicStats).reduce(
          (sum, stat) => sum + stat.count,
          0
        );
        const totalQuestions = Object.values(topicStats).reduce(
          (sum, stat) => sum + stat.total,
          0
        );
        const topicProgress = (totalCompleted / totalQuestions) * 100;

        return (
          <motion.div
            key={topic}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-border rounded-lg overflow-hidden bg-card"
          >
            {/* Topic Header */}
            <motion.button
              onClick={() => toggleTopic(topic)}
              className="w-full p-6 text-left hover:bg-muted/50 transition-colors"
              whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{ rotate: isTopicExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="h-6 w-6 text-muted-foreground" />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h2 className="text-2xl font-bold text-foreground">
                        {topic}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-semibold text-foreground">
                        {totalCompleted} / {totalQuestions}
                      </span>
                      <div className="flex-1 max-w-sm">
                        <div className="w-full bg-muted rounded-full h-3">
                          <motion.div
                            className="bg-primary h-3 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${topicProgress}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: isTopicExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-6 w-6 text-muted-foreground" />
                </motion.div>
              </div>
            </motion.button>

            {/* Topic Content - Difficulty Sections */}
            <AnimatePresence>
              {isTopicExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden border-t border-border"
                >
                  <div className="p-4 space-y-4">
                    {difficultyOrder.map((difficulty) => {
                      const sectionQuestions = difficulties[difficulty] || [];
                      const topicDifficultyKey = `${topic}-${difficulty}`;
                      const isDifficultyExpanded =
                        expandedDifficulties.includes(topicDifficultyKey);
                      const completed = sectionQuestions.length;
                      const total = topicStats[difficulty].total;
                      const progressPercentage =
                        total > 0 ? (completed / total) * 100 : 0;

                      if (completed === 0) return null;

                      return (
                        <motion.div
                          key={difficulty}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="border border-border/50 rounded-lg overflow-hidden bg-card/50"
                        >
                          <motion.button
                            onClick={() => toggleDifficulty(topicDifficultyKey)}
                            className="w-full p-4 text-left hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <motion.div
                                  animate={{
                                    rotate: isDifficultyExpanded ? 90 : 0,
                                  }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </motion.div>
                                <Badge
                                  className={`${
                                    difficultyColors[
                                      difficulty as keyof typeof difficultyColors
                                    ]
                                  } text-xs px-2 py-1 capitalize`}
                                >
                                  {difficulty}
                                </Badge>
                                <span className="font-medium capitalize">
                                  {difficulty} Problems
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold">
                                  {completed} / {total}
                                </span>
                                <div className="w-20">
                                  <div className="w-full bg-muted rounded-full h-1.5">
                                    <motion.div
                                      className={`h-1.5 rounded-full ${
                                        difficultyProgressColors[
                                          difficulty as keyof typeof difficultyProgressColors
                                        ]
                                      }`}
                                      initial={{ width: 0 }}
                                      animate={{
                                        width: `${progressPercentage}%`,
                                      }}
                                      transition={{ duration: 0.8, delay: 0.1 }}
                                    />
                                  </div>
                                </div>
                                <motion.div
                                  animate={{
                                    rotate: isDifficultyExpanded ? 180 : 0,
                                  }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </motion.div>
                              </div>
                            </div>
                          </motion.button>

                          {/* Questions List */}
                          <AnimatePresence>
                            {isDifficultyExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: 0.3,
                                  ease: "easeInOut",
                                }}
                                className="overflow-hidden border-t border-border/30"
                              >
                                <div className="p-4 space-y-3">
                                  {sectionQuestions.map((question, index) => (
                                    <motion.div
                                      key={question.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.1 }}
                                    >
                                      <Card className="transition-all duration-200 hover:shadow-md hover:bg-muted/30 group cursor-pointer">
                                        <CardHeader className="pb-3">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <Code2 className="h-4 w-4 text-primary" />
                                              <CardTitle className="text-base font-medium group-hover:text-primary transition-colors">
                                                {question.question.replace(
                                                  /_/g,
                                                  " "
                                                )}
                                              </CardTitle>
                                            </div>
                                            <div className="flex items-center text-muted-foreground text-sm">
                                              <Clock className="h-3 w-3 mr-1" />
                                              #{question.id}
                                            </div>
                                          </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                          <CardDescription className="mb-3 text-sm line-clamp-2">
                                            {question.markdown
                                              .replace("/* QUESTION:- ", "")
                                              .replace(" */", "")
                                              .substring(0, 100)}
                                            ...
                                          </CardDescription>
                                          <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                          >
                                            <Button
                                              size="sm"
                                              className="bg-primary hover:bg-primary/90"
                                            >
                                              Solve Challenge
                                              <ChevronRight className="ml-1 h-3 w-3" />
                                            </Button>
                                          </motion.div>
                                        </CardContent>
                                      </Card>
                                    </motion.div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
