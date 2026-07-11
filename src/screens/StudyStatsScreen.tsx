import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { client } from "../lib/client";

type QuizSessionItem = {
    id: string;
    score?: number | null;
    totalQuestions?: number | null;
    correctCount?: number | null;
    isPassed?: boolean | null;
    status?: string | null;
};

export default function StudyStatsScreen() {
    const [sessions, setSessions] = useState<QuizSessionItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadStats = useCallback(async () => {
        setLoading(true);

        try {
            const result = await client.models.QuizSession.list();
            setSessions((result.data ?? []) as QuizSessionItem[]);
        } catch (error) {
            console.error("Stats load error:", error);
            Alert.alert("エラー", "学習統計の取得に失敗しました。");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadStats();
    }, [loadStats]);

    const stats = useMemo(() => {
        const submitted = sessions.filter(
            (session) => session.status === "SUBMITTED",
        );

        const totalSessions = submitted.length;
        const totalQuestions = submitted.reduce(
            (sum, session) => sum + (session.totalQuestions ?? 0),
            0,
        );
        const totalCorrect = submitted.reduce(
            (sum, session) => sum + (session.correctCount ?? 0),
            0,
        );
        const averageScore =
            totalSessions > 0
                ? Math.round(
                      submitted.reduce(
                          (sum, session) => sum + (session.score ?? 0),
                          0,
                      ) / totalSessions,
                  )
                : 0;
        const passCount = submitted.filter(
            (session) => session.isPassed,
        ).length;
        const accuracy =
            totalQuestions > 0
                ? Math.round((totalCorrect / totalQuestions) * 100)
                : 0;

        return {
            totalSessions,
            totalQuestions,
            totalCorrect,
            averageScore,
            passCount,
            accuracy,
        };
    }, [sessions]);

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            refreshControl={
                <RefreshControl refreshing={loading} onRefresh={loadStats} />
            }
        >
            <Text style={styles.title}>学習統計</Text>

            <View style={styles.grid}>
                <View style={styles.card}>
                    <Text style={styles.label}>学習回数</Text>
                    <Text style={styles.value}>{stats.totalSessions}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>回答問題数</Text>
                    <Text style={styles.value}>{stats.totalQuestions}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>正解数</Text>
                    <Text style={styles.value}>{stats.totalCorrect}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>正答率</Text>
                    <Text style={styles.value}>{stats.accuracy}%</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>平均点</Text>
                    <Text style={styles.value}>{stats.averageScore}点</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>合格回数</Text>
                    <Text style={styles.value}>{stats.passCount}</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 16,
        backgroundColor: "#ffffff",
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1f2937",
    },
    grid: {
        gap: 12,
    },
    card: {
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 12,
        padding: 18,
        backgroundColor: "#f8fafc",
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: "700",
        color: "#6b7280",
    },
    value: {
        fontSize: 32,
        fontWeight: "800",
        color: "#1f2937",
    },
});
