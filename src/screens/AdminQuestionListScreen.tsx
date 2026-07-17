import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../components/AppButton";
import { client } from "../lib/client";
import type { RootStackParamList } from "../navigation/RootNavigator";
import AdminOnly from "../components/AdminOnly";

type Props = NativeStackScreenProps<RootStackParamList, "AdminQuestionList">;

type QuestionItem = {
    id: string;
    examId?: string | null;
    questionNo?: number | null;
    questionText?: string | null;
    category?: string | null;
    difficulty?: string | null;
    status?: string | null;
};

type ExamItem = {
    id: string;
    code?: string | null;
    title?: string | null;
};

export default function AdminQuestionListScreen({ navigation }: Props) {
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [examCodeById, setExamCodeById] = useState<Record<string, string>>(
        {},
    );
    const [loading, setLoading] = useState(false);

    const loadQuestions = useCallback(async () => {
        setLoading(true);

        try {
            const [questionResult, examResult] = await Promise.all([
                client.models.Question.list(),
                client.models.Exam.list(),
            ]);

            const exams = (examResult.data ?? []) as ExamItem[];

            const nextExamCodeById = exams.reduce<Record<string, string>>(
                (acc, exam) => {
                    acc[exam.id] = exam.code ?? "-";
                    return acc;
                },
                {},
            );

            setExamCodeById(nextExamCodeById);

            const sortedQuestions = (
                (questionResult.data ?? []) as QuestionItem[]
            ).sort((a, b) => {
                const examCodeA = a.examId
                    ? (nextExamCodeById[a.examId] ?? "")
                    : "";
                const examCodeB = b.examId
                    ? (nextExamCodeById[b.examId] ?? "")
                    : "";

                const examCompare = examCodeA.localeCompare(examCodeB);

                if (examCompare !== 0) {
                    return examCompare;
                }

                return (a.questionNo ?? 0) - (b.questionNo ?? 0);
            });

            setQuestions(sortedQuestions);
        } catch (error) {
            console.error("Question list error:", error);
            Alert.alert("エラー", "問題一覧の取得に失敗しました。");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadQuestions();
    }, [loadQuestions]);

    const deleteQuestion = (questionId: string) => {
        Alert.alert("削除確認", "この問題を削除しますか？", [
            { text: "キャンセル", style: "cancel" },
            {
                text: "削除",
                style: "destructive",
                onPress: async () => {
                    try {
                        await client.models.Question.delete({ id: questionId });
                        await loadQuestions();
                    } catch (error) {
                        console.error("Question delete error:", error);
                        Alert.alert("エラー", "問題の削除に失敗しました。");
                    }
                },
            },
        ]);
    };

    const showQuestionActionDialog = (question: QuestionItem) => {
        Alert.alert(
            "問題の操作",
            `問題${question.questionNo ?? "-"}をどうしますか？`,
            [
                {
                    text: "キャンセル",
                    style: "cancel",
                },
                {
                    text: "編集",
                    onPress: () =>
                        navigation.navigate("AdminQuestionEdit", {
                            questionId: question.id,
                        }),
                },
                {
                    text: "削除",
                    style: "destructive",
                    onPress: () => deleteQuestion(question.id),
                },
            ],
        );
    };

    return (
        <AdminOnly onBack={() => navigation.navigate("Home")}>
            <View style={styles.root}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>問題一覧</Text>
                        <AppButton
                            mode="outlined"
                            onPress={() =>
                                navigation.navigate("AdminQuestionCreate")
                            }
                        >
                            新規登録
                        </AppButton>
                    </View>

                    <FlatList
                        data={questions}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl
                                refreshing={loading}
                                onRefresh={loadQuestions}
                            />
                        }
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>
                                問題がありません。
                            </Text>
                        }
                        renderItem={({ item }) => (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.card,
                                    pressed && styles.cardPressed,
                                ]}
                                onPress={() => showQuestionActionDialog(item)}
                            >
                                <View style={styles.questionHeaderRow}>
                                    <Text style={styles.examCode}>
                                        問題セット:{" "}
                                        {item.examId
                                            ? (examCodeById[item.examId] ?? "-")
                                            : "-"}
                                    </Text>

                                    <Text style={styles.questionNo}>
                                        問題{item.questionNo ?? "-"}
                                    </Text>
                                </View>

                                <Text
                                    style={styles.questionText}
                                    numberOfLines={3}
                                >
                                    {item.questionText}
                                </Text>

                                <View style={styles.metaRow}>
                                    <Text
                                        style={[styles.meta, styles.metaText]}
                                    >
                                        カテゴリ: {item.category ?? "-"} /
                                        難易度: {item.difficulty ?? "-"}
                                    </Text>

                                    <View
                                        style={[
                                            styles.statusBadge,
                                            item.status === "PUBLISHED"
                                                ? styles.statusBadgePublished
                                                : styles.statusBadgeDraft,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.statusBadgeText,
                                                item.status === "PUBLISHED"
                                                    ? styles.statusBadgeTextPublished
                                                    : styles.statusBadgeTextDraft,
                                            ]}
                                        >
                                            {item.status === "PUBLISHED"
                                                ? "公開"
                                                : "下書き"}
                                        </Text>
                                    </View>
                                </View>
                            </Pressable>
                        )}
                    />
                </View>
            </View>
        </AdminOnly>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#ffffff",
    },

    content: {
        flex: 1,
        padding: 16,
        backgroundColor: "#ffffff",
    },

    listContent: {
        paddingBottom: 80,
    },
    header: {
        gap: 12,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1f2937",
    },
    emptyText: {
        color: "#6b7280",
        lineHeight: 22,
    },
    card: {
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        gap: 8,
        backgroundColor: "#ffffff",
    },
    questionText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1f2937",
        lineHeight: 24,
    },
    meta: {
        fontSize: 13,
        color: "#6b7280",
    },
    cardPressed: {
        opacity: 0.7,
    },
    questionNo: {
        fontSize: 14,
        fontWeight: "800",
        color: "#66728d",
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },

    metaText: {
        flex: 1,
    },

    statusBadge: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },

    statusBadgePublished: {
        backgroundColor: "#dcfce7",
    },

    statusBadgeDraft: {
        backgroundColor: "#f3f4f6",
    },

    statusBadgeText: {
        fontSize: 12,
        fontWeight: "700",
    },

    statusBadgeTextPublished: {
        color: "#166534",
    },

    statusBadgeTextDraft: {
        color: "#4b5563",
    },
    questionHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 10,
    },

    examCode: {
        fontSize: 14,
        fontWeight: "800",
        color: "#4b5563",
    },
});
