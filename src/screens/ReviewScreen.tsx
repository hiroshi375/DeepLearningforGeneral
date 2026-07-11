import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { client } from "../lib/client";

type QuizAnswerItem = {
    id: string;
    questionId?: string | null;
    isCorrect?: boolean | null;
    selectedChoiceIds?: string[] | null;
    answeredAt?: string | null;
};

type QuestionItem = {
    id: string;
    questionText?: string | null;
};

type ReviewItem = {
    answer: QuizAnswerItem;
    question?: QuestionItem;
};

export default function ReviewScreen() {
    const [items, setItems] = useState<ReviewItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadReview = useCallback(async () => {
        setLoading(true);

        try {
            const answerResult = await client.models.QuizAnswer.list({
                filter: {
                    isCorrect: {
                        eq: false,
                    },
                },
            });

            const answers = (answerResult.data ?? []) as QuizAnswerItem[];
            const reviewItems: ReviewItem[] = [];

            for (const answer of answers) {
                let question: QuestionItem | undefined;

                if (answer.questionId) {
                    const questionResult = await client.models.Question.get({
                        id: answer.questionId,
                    });
                    question = questionResult.data as QuestionItem | undefined;
                }

                reviewItems.push({ answer, question });
            }

            setItems(reviewItems);
        } catch (error) {
            console.error("Review load error:", error);
            Alert.alert("エラー", "復習データの取得に失敗しました。");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadReview();
    }, [loadReview]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>復習</Text>
            <Text style={styles.description}>
                過去に不正解だった問題を確認します。
            </Text>

            <FlatList
                data={items}
                keyExtractor={(item) => item.answer.id}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={loadReview}
                    />
                }
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        復習対象の問題はありません。
                    </Text>
                }
                renderItem={({ item, index }) => (
                    <View style={styles.card}>
                        <Text style={styles.questionNumber}>
                            復習問題 {index + 1}
                        </Text>
                        <Text style={styles.questionText}>
                            {item.question?.questionText ?? "問題文なし"}
                        </Text>
                        <Text style={styles.meta}>
                            回答日時:{" "}
                            {item.answer.answeredAt
                                ? new Date(
                                      item.answer.answeredAt,
                                  ).toLocaleString()
                                : "-"}
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
        padding: 16,
        backgroundColor: "#ffffff",
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1f2937",
    },
    description: {
        marginTop: 4,
        marginBottom: 16,
        color: "#4b5563",
        lineHeight: 22,
    },
    emptyText: {
        color: "#6b7280",
    },
    card: {
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
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
    meta: {
        fontSize: 13,
        color: "#6b7280",
    },
});
