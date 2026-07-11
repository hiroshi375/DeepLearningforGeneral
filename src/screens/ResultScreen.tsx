import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../components/AppButton";
import { client } from "../lib/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Result">;

type QuizSessionItem = {
    id: string;
    totalQuestions?: number | null;
    correctCount?: number | null;
    score?: number | null;
    passScore?: number | null;
    isPassed?: boolean | null;
    status?: string | null;
};

export default function ResultScreen({ route, navigation }: Props) {
    const { sessionId } = route.params;

    const [session, setSession] = useState<QuizSessionItem | null>(null);
    const [loading, setLoading] = useState(true);

    const loadResult = useCallback(async () => {
        setLoading(true);

        try {
            const result = await client.models.QuizSession.get({
                id: sessionId,
            });

            setSession(result.data as QuizSessionItem | null);
        } catch (error) {
            console.error("Result load error:", error);
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        void loadResult();
    }, [loadResult]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text>結果を読み込み中...</Text>
            </View>
        );
    }

    if (!session) {
        return (
            <View style={styles.center}>
                <Text style={styles.title}>結果が見つかりませんでした</Text>
                <AppButton onPress={() => navigation.navigate("Home")}>
                    ホームへ戻る
                </AppButton>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>結果</Text>

            <View style={styles.resultCard}>
                <Text
                    style={[
                        styles.passText,
                        session.isPassed ? styles.passed : styles.failed,
                    ]}
                >
                    {session.isPassed ? "合格" : "不合格"}
                </Text>

                <Text style={styles.score}>{session.score ?? 0}点</Text>

                <Text style={styles.detail}>
                    正解数: {session.correctCount ?? 0} /{" "}
                    {session.totalQuestions ?? 0}
                </Text>

                <Text style={styles.detail}>
                    合格点: {session.passScore ?? "-"}点
                </Text>
            </View>

            <AppButton onPress={() => navigation.navigate("ExamList")}>
                別の問題セットを解く
            </AppButton>

            <AppButton
                mode="outlined"
                onPress={() => navigation.navigate("Home")}
            >
                ホームへ戻る
            </AppButton>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        gap: 16,
        backgroundColor: "#ffffff",
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 20,
        backgroundColor: "#ffffff",
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1f2937",
    },
    resultCard: {
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#d8dce8",
        backgroundColor: "#f8fafc",
        gap: 10,
    },
    passText: {
        fontSize: 28,
        fontWeight: "800",
    },
    passed: {
        color: "#166534",
    },
    failed: {
        color: "#b91c1c",
    },
    score: {
        fontSize: 36,
        fontWeight: "800",
        color: "#1f2937",
    },
    detail: {
        fontSize: 16,
        color: "#4b5563",
    },
});
