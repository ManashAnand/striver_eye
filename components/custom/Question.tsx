"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronDown, BookOpen } from "lucide-react";

interface QuestionType {
	id: number;
	title: string;
	difficulty: string;
	question: string;
	markdown: string;
	created_at: string;
} 

const Question = ({ questions }: { questions: QuestionType[] }) => {
	const [expandedTopics, setExpandedTopics] = useState<string[]>([]);
	const router = useRouter();
	const orderedDifficulties = useMemo(() => ["easy", "medium", "hard"] as const, []);

	const groupedByTitle = useMemo(() => {
		const map: Record<string, Record<string, QuestionType[]>> = {};
		for (const q of questions) {
			const difficultyKey = q.difficulty.toLowerCase();
			if (!orderedDifficulties.includes(difficultyKey as any)) continue;
			if (!map[q.title]) map[q.title] = {} as Record<string, QuestionType[]>;
			if (!map[q.title][difficultyKey]) map[q.title][difficultyKey] = [];
			map[q.title][difficultyKey].push(q);
		}
		return map;
	}, [questions, orderedDifficulties]);

	const toggleTopic = (title: string) => {
		setExpandedTopics((prev) =>
			prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
		);
	};

	return (
		<div className="space-y-4">
			{Object.entries(groupedByTitle).map(([title, diffs]) => {
				const isTitleOpen = expandedTopics.includes(title);
				const totalCount = Object.values(diffs).reduce(
					(sum, arr) => sum + arr.length,
					0
				);
				return (
					<div
						key={title}
						className="rounded-lg border border-border/60 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 overflow-hidden"
					>
						<button
							type="button"
							className="w-full px-5 py-4 text-left hover:bg-muted/40 transition-colors"
							onClick={() => toggleTopic(title)}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<span
										className={`transition-transform duration-200 ${
											isTitleOpen ? "rotate-90" : "rotate-0"
										}`}
									>
										<ChevronRight className="h-5 w-5 text-muted-foreground" />
									</span>
									<div className="flex items-center gap-2">
										<BookOpen className="h-5 w-5 text-primary" />
										<span className="text-lg font-semibold text-foreground">
											{title}
										</span>
									</div>
								</div>
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<span>{totalCount} questions</span>
									<ChevronDown
										className={`h-4 w-4 transition-transform duration-200 ${
											isTitleOpen ? "rotate-180" : "rotate-0"
										}`}
									/>
								</div>
							</div>
						</button>
						{isTitleOpen && (
							<div className="border-t border-border">
								{orderedDifficulties.map((diff) => {
									const list = diffs[diff] || [];
									if (list.length === 0) return null;
									return (
										<div
											key={`${title}__${diff}`}
											className="border-b last:border-b-0 border-border/60"
										>
											<div className="px-5 py-2 flex items-center justify-between bg-muted/20">
												<span
													className={`capitalize font-medium ${
														diff === "easy"
															? "text-green-400"
														: diff === "medium"
														? "text-yellow-400"
														: "text-red-400"
													}`}
												>
													{diff}
												</span>
												<span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full border border-border/60">
													{list.length}
												</span>
											</div>
											<ul className="px-5 pb-3 space-y-1">
												{list.map((q) => (
													<li
														key={q.id}
														className="text-sm text-foreground/90 px-3 py-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer"
														onClick={() => {
															router.push(`/chatbot/${q.id}`);
														}}
													>
														{q.question?.replace(/_/g, " ").trim()}
													</li>
												))}
											</ul>
										</div>
									);
								})}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};

export default Question