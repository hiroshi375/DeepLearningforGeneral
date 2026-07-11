import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { client } from "../lib/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "ResultDetail">;

type QuizSessionItem = {
    id: string;
    score?: number | null;
    totalQuestions?: number | null;
    correctCount?: number | null;
    passScore?: number | null;
    isPassed?: boolean | null;
};

type QuizAnswerItem = {
    id: string;
    questionId?: string | null;
    selectedChoiceIds?: string[] | null;
    isCorrect?: boolean | null;
    score?: number | null;
};

type QuestionItem = {
    id: string;
    questionText?: string | null;
};

type DetailItem = {
    answer: QuizAnswerItem;
    question?: QuestionItem;
};

export default function ResultDetailScreen({ route }: Props) {
    const { sessionId } = route.params;

    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<QuizSessionItem | null>(null);
    const [details, setDetails] = useState<DetailItem[]>([]);

    const loadDetail = useCallback(async () => {
        setLoading(true);

        try {
            const sessionResult = await client.models.QuizSession.get({
                id: sessionId,
            });

            setSession(sessionResult.data as QuizSessionItem | null);

            const answerResult = await client.models.QuizAnswer.list({
                filter: {
                    sessionId: {
                        eq: sessionId,
                    },
                },
            });

            const answers = (answerResult.data ?? []) as QuizAnswerItem[];
            const items: DetailItem[] = [];

            for (const answer of answers) {
                let question: QuestionItem | undefined;

                if (answer.questionId) {
                    const questionResult = await client.models.Question.get({
                        id: answer.questionId,
                    });
                    question = questionResult.data as QuestionItem | undefined;
                }

                items.push({ answer, question });
            }

            setDetails(items);
        } catch (error) {
            console.error("Result detail error:", error);
            Alert.alert("エラー", "結果詳細の取得に失敗しました。");
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        void loadDetail();
    }, [loadDetail]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text>読み込み中...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.summary}>
                <Text style={styles.title}>結果詳細</Text>
                <Text style={styles.score}>{session?.score ?? 0}点</Text>
                <Text style={styles.meta}>
                    正解数: {session?.correctCount ?? 0} /{" "}
                    {session?.totalQuestions ?? 0}
                </Text>
                <Text style={styles.meta}>
                    合格点: {session?.passScore ?? "-"}点
                </Text>
                <Text
                    style={[
                        styles.resultText,
                        session?.isPassed ? styles.passed : styles.failed,
                    ]}
                >
                    {session?.isPassed ? "合格" : "不合格"}
                </Text>
            </View>

            <FlatList
                data={details}
                keyExtractor={(item) => item.answer.id}
                renderItem={({ item, index }) => (
                    <View style={styles.card}>
                        <Text style={styles.questionNumber}>
                            問 {index + 1}
                        </Text>
                        <Text style={styles.questionText}>
                            {item.question?.questionText ?? "問題文なし"}
                        </Text>
                        <Text
                            style={[
                                styles.answerResult,
                                item.answer.isCorrect
                                    ? styles.passed
                                    : styles.failed,
                            ]}
                        >
                            {item.answer.isCorrect ? "正解" : "不正解"}
                        </Text>
                        <Text style={styles.meta}>
                            選択ID:{" "}
                            {(item.answer.selectedChoiceIds ?? []).join(", ")}
                        </Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#ffffff",
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    summary: {
        padding: 16,
        gap: 6,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1f2937",
    },
    score: {
        fontSize: 32,
        fontWeight: "800",
        color: "#1f2937",
    },
    meta: {
        fontSize: 13,
        color: "#6b7280",
    },
    resultText: {
        fontSize: 16,
        fontWeight: "800",
    },
    passed: {
        color: "#166534",
    },
    failed: {
        color: "#b91c1c",
    },
    card: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        gap: 8,
    },
    questionNumber: {
        fontSize: 14,
        fontWeight: "800",
        color: "#4b6f8f",
    },
    questionText: {
        fontSize: 15,
        lineHeight: 23,
        color: "#1f2937",
        fontWeight: "700",
    },
    answerResult: {
        fontSize: 15,
        fontWeight: "800",
    },
});
