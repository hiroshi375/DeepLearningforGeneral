import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    FlatList,
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
    questionText?: string | null;
    category?: string | null;
    difficulty?: string | null;
    status?: string | null;
};

export default function AdminQuestionListScreen({ navigation }: Props) {
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadQuestions = useCallback(async () => {
        setLoading(true);

        try {
            const result = await client.models.Question.list();
            setQuestions((result.data ?? []) as QuestionItem[]);
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

    return (
        <AdminOnly onBack={() => navigation.navigate("Home")}>
            <View style={styles.container}>
                <View style={styles.container}>
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
                            <View style={styles.card}>
                                <Text
                                    style={styles.questionText}
                                    numberOfLines={3}
                                >
                                    {item.questionText}
                                </Text>

                                <Text style={styles.meta}>
                                    カテゴリ: {item.category ?? "-"} / 難易度:{" "}
                                    {item.difficulty ?? "-"}
                                </Text>

                                <Text style={styles.meta}>
                                    状態: {item.status ?? "-"}
                                </Text>

                                <View style={styles.buttonRow}>
                                    <AppButton
                                        onPress={() =>
                                            navigation.navigate(
                                                "AdminQuestionEdit",
                                                {
                                                    questionId: item.id,
                                                },
                                            )
                                        }
                                    >
                                        編集
                                    </AppButton>

                                    <AppButton
                                        mode="outlined"
                                        onPress={() => deleteQuestion(item.id)}
                                    >
                                        削除
                                    </AppButton>
                                </View>
                            </View>
                        )}
                    />
                </View>
            </View>
        </AdminOnly>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: "#ffffff",
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
    buttonRow: {
        flexDirection: "row",
        gap: 8,
    },
});
