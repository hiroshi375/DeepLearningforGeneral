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

type Props = NativeStackScreenProps<RootStackParamList, "QuizHistory">;

type QuizSessionItem = {
    id: string;
    examId?: string | null;
    mode?: string | null;
    startedAt?: string | null;
    submittedAt?: string | null;
    totalQuestions?: number | null;
    correctCount?: number | null;
    score?: number | null;
    isPassed?: boolean | null;
    status?: string | null;
};

export default function QuizHistoryScreen({ navigation }: Props) {
    const [sessions, setSessions] = useState<QuizSessionItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadHistory = useCallback(async () => {
        setLoading(true);

        try {
            const result = await client.models.QuizSession.list();
            const data = ((result.data ?? []) as QuizSessionItem[]).sort(
                (a, b) =>
                    new Date(b.startedAt ?? 0).getTime() -
                    new Date(a.startedAt ?? 0).getTime(),
            );

            setSessions(data);
        } catch (error) {
            console.error("History load error:", error);
            Alert.alert("エラー", "学習履歴の取得に失敗しました。");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadHistory();
    }, [loadHistory]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>学習履歴</Text>

            <FlatList
                data={sessions}
                keyExtractor={(item) => item.id}
                refreshControl={
                    <RefreshControl
                        refreshing={loading}
                        onRefresh={loadHistory}
                    />
                }
                ListEmptyComponent={
                    <Text style={styles.emptyText}>履歴がありません。</Text>
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.score}>{item.score ?? 0}点</Text>

                        <Text style={styles.meta}>
                            正解数: {item.correctCount ?? 0} /{" "}
                            {item.totalQuestions ?? 0}
                        </Text>

                        <Text style={styles.meta}>
                            モード: {item.mode ?? "-"} / 状態:{" "}
                            {item.status ?? "-"}
                        </Text>

                        <Text style={styles.meta}>
                            開始:{" "}
                            {item.startedAt
                                ? new Date(item.startedAt).toLocaleString()
                                : "-"}
                        </Text>

                        <Text
                            style={[
                                styles.resultText,
                                item.isPassed ? styles.passed : styles.failed,
                            ]}
                        >
                            {item.isPassed ? "合格" : "不合格"}
                        </Text>

                        <AppButton
                            onPress={() =>
                                navigation.navigate("ResultDetail", {
                                    sessionId: item.id,
                                })
                            }
                        >
                            詳細を見る
                        </AppButton>
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
        marginBottom: 16,
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
    score: {
        fontSize: 28,
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
});
