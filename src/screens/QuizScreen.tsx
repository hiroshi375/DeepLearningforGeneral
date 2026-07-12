import { useCallback, useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Pressable,
    Platform,
} from "react-native";
import AppButton from "../components/AppButton";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getCurrentUser } from "aws-amplify/auth";

import { client } from "../lib/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Quiz">;

type QuestionItem = {
    id: string;
    questionNo?: number | null;
    questionText?: string | null;
    questionType?: string | null;
    selectionMax?: number | null;
    score?: number | null;
};

type ChoiceItem = {
    id: string;
    questionId?: string | null;
    label?: string | null;
    choiceText?: string | null;
    displayOrder?: number | null;
};

type SolutionItem = {
    id: string;
    questionId?: string | null;
    correctChoiceIds?: string[] | null;
    explanationText?: string | null;
};

type ExamItem = {
    id: string;
    passScore?: number | null;
};

type ChoiceFeedbackType = "correct" | "incorrect" | "normal";

type QuestionUiState = {
    selectedChoiceIds: string[];
    answered: boolean;
    isCorrect: boolean | null;
};

const APP_FONT_FAMILY = Platform.select({
    ios: "Hiragino Sans",
    android: "sans-serif",
    default: undefined,
});

export default function QuizScreen({ route, navigation }: Props) {
    const { examId, mode = "PRACTICE" } = route.params;

    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [choices, setChoices] = useState<ChoiceItem[]>([]);
    const [solutions, setSolutions] = useState<SolutionItem[]>([]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedChoiceIds, setSelectedChoiceIds] = useState<string[]>([]);
    const [answered, setAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [questionUiStates, setQuestionUiStates] = useState<
        Record<string, QuestionUiState>
    >({});
    const [correctCount, setCorrectCount] = useState(0);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [exam, setExam] = useState<ExamItem | null>(null);

    const currentQuestion = questions[currentIndex];

    const displayQuestionNo = currentQuestion?.questionNo ?? currentIndex + 1;
    const progressRate =
        questions.length > 0 ? (currentIndex + 1) / questions.length : 0;
    const currentChoices = useMemo(() => {
        if (!currentQuestion) {
            return [];
        }

        return choices
            .filter((choice) => choice.questionId === currentQuestion.id)
            .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    }, [choices, currentQuestion]);

    const currentSolution = useMemo(() => {
        if (!currentQuestion) {
            return null;
        }

        return solutions.find(
            (solution) => solution.questionId === currentQuestion.id,
        );
    }, [solutions, currentQuestion]);

    const correctChoiceIds = useMemo(() => {
        return currentSolution?.correctChoiceIds ?? [];
    }, [currentSolution]);

    const requiredSelectionCount = useMemo(() => {
        if (!currentQuestion) {
            return 1;
        }

        const questionType = currentQuestion.questionType ?? "SINGLE";

        if (questionType === "SINGLE") {
            return 1;
        }

        return Math.max(
            1,
            currentQuestion.selectionMax ??
                (correctChoiceIds.length > 0 ? correctChoiceIds.length : 1),
        );
    }, [currentQuestion, correctChoiceIds]);

    const hasRequiredSelection =
        selectedChoiceIds.length === requiredSelectionCount;

    const getChoiceFeedbackType = useCallback(
        (choiceId: string): ChoiceFeedbackType => {
            if (!answered) {
                return "normal";
            }

            const isCorrectChoice = correctChoiceIds.includes(choiceId);
            const isSelectedChoice = selectedChoiceIds.includes(choiceId);

            if (isCorrectChoice) {
                return "correct";
            }

            if (isSelectedChoice && !isCorrectChoice) {
                return "incorrect";
            }

            return "normal";
        },
        [answered, correctChoiceIds, selectedChoiceIds],
    );

    const loadQuiz = useCallback(async () => {
        try {
            const user = await getCurrentUser();

            const examResult = await client.models.Exam.get({
                id: examId,
            });

            if (examResult.errors || !examResult.data) {
                console.error("Exam get errors:", examResult.errors);
                Alert.alert("エラー", "試験情報の取得に失敗しました。");
                return;
            }

            const loadedExam = examResult.data as ExamItem;
            setExam(loadedExam);

            const passScore = loadedExam.passScore ?? 70;

            const sessionResult = await client.models.QuizSession.create({
                userId: user.userId,
                examId,
                mode,
                startedAt: new Date().toISOString(),
                totalQuestions: 0,
                correctCount: 0,
                score: 0,
                passScore,
                isPassed: false,
                status: "IN_PROGRESS",
            });
            if (sessionResult.errors || !sessionResult.data?.id) {
                console.error("Session create errors:", sessionResult.errors);
                Alert.alert("エラー", "セッション作成に失敗しました。");
                return;
            }

            setSessionId(sessionResult.data.id);

            const questionResult = await client.models.Question.list({
                filter: {
                    examId: {
                        eq: examId,
                    },
                    status: {
                        eq: "PUBLISHED",
                    },
                },
            });

            const questionData = (
                (questionResult.data ?? []) as QuestionItem[]
            ).sort(
                (a, b) =>
                    (a.questionNo ?? Number.MAX_SAFE_INTEGER) -
                    (b.questionNo ?? Number.MAX_SAFE_INTEGER),
            );

            setQuestions(questionData);

            const questionIds = questionData.map((question) => question.id);

            const allChoices: ChoiceItem[] = [];
            const allSolutions: SolutionItem[] = [];

            for (const questionId of questionIds) {
                const choiceResult = await client.models.Choice.list({
                    filter: {
                        questionId: {
                            eq: questionId,
                        },
                    },
                });

                allChoices.push(...((choiceResult.data ?? []) as ChoiceItem[]));

                const solutionResult =
                    await client.models.QuestionSolution.list({
                        filter: {
                            questionId: {
                                eq: questionId,
                            },
                        },
                    });

                allSolutions.push(
                    ...((solutionResult.data ?? []) as SolutionItem[]),
                );
            }

            setChoices(allChoices);
            setSolutions(allSolutions);
        } catch (error) {
            console.error("Load quiz error:", error);
            Alert.alert("エラー", "問題の読み込みに失敗しました。");
        }
    }, [examId, mode]);

    useEffect(() => {
        void loadQuiz();
    }, [loadQuiz]);

    const saveCurrentQuestionState = useCallback(() => {
        if (!currentQuestion) {
            return;
        }

        setQuestionUiStates((prev) => ({
            ...prev,
            [currentQuestion.id]: {
                selectedChoiceIds,
                answered,
                isCorrect,
            },
        }));
    }, [currentQuestion, selectedChoiceIds, answered, isCorrect]);

    const toggleChoice = (choiceId: string) => {
        if (answered || !currentQuestion) {
            return;
        }

        const questionType = currentQuestion.questionType ?? "SINGLE";

        if (questionType === "SINGLE") {
            setSelectedChoiceIds([choiceId]);
            return;
        }

        setSelectedChoiceIds((prev) => {
            if (prev.includes(choiceId)) {
                return prev.filter((id) => id !== choiceId);
            }

            const max = currentQuestion.selectionMax ?? 1;

            if (prev.length >= max) {
                return prev;
            }

            return [...prev, choiceId];
        });
    };

    const goPrevious = () => {
        if (currentIndex <= 0) {
            return;
        }

        moveToQuestion(currentIndex - 1);
    };

    const checkAnswer = async () => {
        if (!currentQuestion || !currentSolution || !sessionId) {
            return;
        }

        if (selectedChoiceIds.length === 0) {
            Alert.alert("未選択", "回答を選択してください。");
            return;
        }

        const correctChoiceIds = currentSolution.correctChoiceIds ?? [];

        const sortedSelected = [...selectedChoiceIds].sort();
        const sortedCorrect = [...correctChoiceIds].sort();

        const correct =
            sortedSelected.length === sortedCorrect.length &&
            sortedSelected.every((id, index) => id === sortedCorrect[index]);

        setIsCorrect(correct);
        setAnswered(true);

        setQuestionUiStates((prev) => ({
            ...prev,
            [currentQuestion.id]: {
                selectedChoiceIds,
                answered: true,
                isCorrect: correct,
            },
        }));

        if (correct) {
            setCorrectCount((prev) => prev + 1);
        }

        await client.models.QuizAnswer.create({
            sessionId,
            questionId: currentQuestion.id,
            selectedChoiceIds,
            isCorrect: correct,
            score: correct ? (currentQuestion.score ?? 1) : 0,
            answeredAt: new Date().toISOString(),
            explanationShown: true,
        });
    };

    const goNext = async () => {
        if (currentIndex + 1 < questions.length) {
            moveToQuestion(currentIndex + 1);
            return;
        }

        if (!sessionId) {
            return;
        }

        const finalCorrectCount = correctCount;

        const score =
            questions.length > 0
                ? Math.round((finalCorrectCount / questions.length) * 100)
                : 0;

        const passScore = exam?.passScore ?? 70;
        const isPassed = score >= passScore;

        await client.models.QuizSession.update({
            id: sessionId,
            submittedAt: new Date().toISOString(),
            totalQuestions: questions.length,
            correctCount: finalCorrectCount,
            score,
            passScore,
            isPassed,
            status: "SUBMITTED",
        });

        navigation.replace("Result", {
            sessionId,
        });
    };

    const handlePrimaryAction = async () => {
        if (selectedChoiceIds.length === 0) {
            await goNext();
            return;
        }

        if (hasRequiredSelection) {
            await checkAnswer();
            return;
        }

        const remainingCount =
            requiredSelectionCount - selectedChoiceIds.length;

        Alert.alert(
            "選択数が不足しています",
            `あと${remainingCount}つ選択してください。`,
        );
    };

    const primaryButtonText =
        selectedChoiceIds.length === 0
            ? "質問を飛ばす"
            : hasRequiredSelection
              ? "回答する"
              : `あと${requiredSelectionCount - selectedChoiceIds.length}つ選択`;

    const moveToQuestion = useCallback(
        (nextIndex: number) => {
            if (!currentQuestion) {
                return;
            }

            setQuestionUiStates((prev) => {
                const updatedStates = {
                    ...prev,
                    [currentQuestion.id]: {
                        selectedChoiceIds,
                        answered,
                        isCorrect,
                    },
                };

                const nextQuestion = questions[nextIndex];
                const nextState = nextQuestion
                    ? updatedStates[nextQuestion.id]
                    : undefined;

                setCurrentIndex(nextIndex);
                setSelectedChoiceIds(nextState?.selectedChoiceIds ?? []);
                setAnswered(nextState?.answered ?? false);
                setIsCorrect(nextState?.isCorrect ?? null);

                return updatedStates;
            });
        },
        [currentQuestion, questions, selectedChoiceIds, answered, isCorrect],
    );

    if (!currentQuestion) {
        return (
            <View style={styles.container}>
                <Text>問題がありません。</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.progressSection}>
                <Text style={styles.progressText}>
                    {currentIndex + 1}/{questions.length}
                </Text>

                <View style={styles.progressBarTrack}>
                    <View
                        style={[
                            styles.progressBarFill,
                            {
                                width: `${progressRate * 100}%`,
                            },
                        ]}
                    />
                </View>
            </View>
            <View style={styles.questionSection}>
                <Text style={styles.questionNumber}>
                    問題{displayQuestionNo}:
                </Text>

                <Text style={styles.questionText}>
                    {currentQuestion.questionText}
                </Text>
            </View>

            {currentChoices.map((choice) => {
                const selected = selectedChoiceIds.includes(choice.id);
                const feedbackType = getChoiceFeedbackType(choice.id);

                return (
                    <Pressable
                        key={choice.id}
                        disabled={answered}
                        onPress={() => toggleChoice(choice.id)}
                        style={[
                            styles.choice,
                            selected && !answered && styles.choiceSelected,
                            feedbackType === "correct" && styles.choiceCorrect,
                            feedbackType === "incorrect" &&
                                styles.choiceIncorrect,
                        ]}
                    >
                        {feedbackType === "correct" && (
                            <View style={styles.correctBadge}>
                                <Text style={styles.correctBadgeText}>
                                    正解
                                </Text>
                            </View>
                        )}

                        {feedbackType === "incorrect" && (
                            <View style={styles.incorrectBadge}>
                                <Text style={styles.incorrectBadgeText}>
                                    回答は不正解です
                                </Text>
                            </View>
                        )}

                        <View style={styles.choiceRow}>
                            <Text
                                style={[
                                    styles.choiceIcon,
                                    feedbackType === "correct" &&
                                        styles.choiceIconCorrect,
                                    feedbackType === "incorrect" &&
                                        styles.choiceIconIncorrect,
                                ]}
                            >
                                {feedbackType === "incorrect"
                                    ? "⊗"
                                    : selected
                                      ? "◉"
                                      : "○"}
                            </Text>

                            <Text style={styles.choiceText}>
                                {choice.label}. {choice.choiceText}
                            </Text>
                        </View>
                    </Pressable>
                );
            })}

            {!answered ? (
                <View style={styles.navigationRow}>
                    {currentIndex > 0 && (
                        <View style={styles.navigationButton}>
                            <AppButton onPress={goPrevious}>戻る</AppButton>
                        </View>
                    )}

                    <View style={styles.navigationButton}>
                        <AppButton onPress={handlePrimaryAction}>
                            {primaryButtonText}
                        </AppButton>
                    </View>
                </View>
            ) : (
                <View style={styles.resultBox}>
                    <Text style={isCorrect ? styles.correct : styles.incorrect}>
                        {isCorrect ? "正解" : "不正解"}
                    </Text>

                    <Text style={styles.explanation}>
                        {currentSolution?.explanationText}
                    </Text>

                    <View style={styles.navigationRow}>
                        {currentIndex > 0 && (
                            <View style={styles.navigationButton}>
                                <AppButton onPress={goPrevious}>戻る</AppButton>
                            </View>
                        )}

                        <View style={styles.navigationButton}>
                            <AppButton onPress={goNext}>
                                {currentIndex + 1 < questions.length
                                    ? "次の問題へ"
                                    : "結果を見る"}
                            </AppButton>
                        </View>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 64,
        gap: 12,
    },
    progressSection: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 12,
    },

    progressText: {
        fontFamily: APP_FONT_FAMILY,
        fontSize: 18,
        lineHeight: 26,
        color: "#2f3349",
        fontWeight: "700",
        minWidth: 44,
    },

    progressBarTrack: {
        flex: 1,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#d8dae6",
        overflow: "hidden",
    },

    progressBarFill: {
        height: "100%",
        borderRadius: 6,
        backgroundColor: "#6d28d9",
    },
    questionSection: {
        marginTop: 8,
        marginBottom: 16,
    },

    questionNumber: {
        fontFamily: APP_FONT_FAMILY,
        fontSize: 20,
        lineHeight: 28,
        fontWeight: "700",
        color: "#2f3349",
        marginBottom: 14,
    },

    questionText: {
        fontFamily: APP_FONT_FAMILY,
        fontSize: 18,
        lineHeight: 30,
        fontWeight: "400",
        color: "#2f3349",
        letterSpacing: 0.2,
    },
    choice: {
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 2,
        paddingVertical: 16,
        paddingHorizontal: 12,
        backgroundColor: "#ffffff",
    },

    choiceSelected: {
        borderColor: "#4b6f8f",
        backgroundColor: "#e8f1f8",
    },

    choiceCorrect: {
        borderColor: "#166534",
        backgroundColor: "#eef9f2",
    },

    choiceIncorrect: {
        borderColor: "#ef4444",
        backgroundColor: "#fff1f2",
    },

    choiceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },

    choiceIcon: {
        width: 24,
        textAlign: "center",
        fontSize: 22,
        color: "#6b6f85",
    },

    choiceIconCorrect: {
        color: "#166534",
    },

    choiceIconIncorrect: {
        color: "#7f1d1d",
    },

    choiceText: {
        flex: 1,
        fontFamily: APP_FONT_FAMILY,
        fontSize: 15,
        lineHeight: 23,
        color: "#4f5268",
        fontWeight: "700",
        letterSpacing: 0.1,
    },

    correctBadge: {
        alignSelf: "flex-start",
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#9fdcb7",
    },

    correctBadgeText: {
        color: "#0f3f2b",
        fontSize: 14,
        fontWeight: "bold",
    },

    incorrectBadge: {
        alignSelf: "flex-start",
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#fecaca",
    },

    incorrectBadgeText: {
        color: "#7f1d1d",
        fontSize: 14,
        fontWeight: "bold",
    },
    resultBox: {
        marginTop: 16,
        padding: 16,
        borderRadius: 8,
        backgroundColor: "#f5f5f5",
        gap: 8,
    },
    correct: {
        color: "green",
        fontSize: 20,
        fontWeight: "700",
    },
    incorrect: {
        color: "red",
        fontSize: 20,
        fontWeight: "700",
    },
    explanation: {
        fontSize: 15,
        lineHeight: 22,
    },
    navigationRow: {
        flexDirection: "row",
        alignItems: "stretch",
        gap: 12,
        marginTop: 4,
    },

    navigationButton: {
        flex: 1,
    },
});
