import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../components/AppButton";
import { client } from "../lib/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "ExamStart">;

type ExamItem = {
    id: string;
    code?: string | null;
    title?: string | null;
    description?: string | null;
    passScore?: number | null;
    totalQuestions?: number | null;
    timeLimitMinutes?: number | null;
    isPublished?: boolean | null;
};

type QuizMode = "PRACTICE" | "EXAM";

export default function ExamStartScreen({ route, navigation }: Props) {
    const { examId } = route.params;

    const [exam, setExam] = useState<ExamItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<QuizMode>("PRACTICE");

    const loadExam = useCallback(async () => {
        setLoading(true);

        try {
            const result = await client.models.Exam.get({
                id: examId,
            });

            if (result.errors) {
                console.error("Exam get errors:", result.errors);
                Alert.alert("エラー", "試験情報の取得に失敗しました。");
                return;
            }

            const loadedExam = result.data as ExamItem | null;

            if (!loadedExam) {
                Alert.alert("エラー", "試験情報が見つかりませんでした。");
                return;
            }

            setExam(loadedExam);
        } catch (error) {
            console.error("Exam get unexpected error:", error);
            Alert.alert("エラー", "試験情報の取得中にエラーが発生しました。");
        } finally {
            setLoading(false);
        }
    }, [examId]);

    useEffect(() => {
        void loadExam();
    }, [loadExam]);

    const startQuiz = () => {
        if (!exam) {
            Alert.alert("エラー", "試験情報が読み込まれていません。");
            return;
        }

        if (!exam.isPublished) {
            Alert.alert("開始できません", "この試験は現在非公開です。");
            return;
        }

        navigation.navigate("Quiz", {
            examId: exam.id,
            mode,
        });
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>試験情報を読み込み中...</Text>
            </View>
        );
    }

    if (!exam) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyTitle}>試験情報がありません</Text>
                <AppButton onPress={() => navigation.goBack()}>戻る</AppButton>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.examCode}>{exam.code ?? "EXAM"}</Text>
                <Text style={styles.title}>{exam.title ?? "試験名なし"}</Text>

                {!!exam.description && (
                    <Text style={styles.description}>{exam.description}</Text>
                )}
            </View>

            <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>問題数</Text>
                    <Text style={styles.infoValue}>
                        {exam.totalQuestions ?? "-"}問
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>合格点</Text>
                    <Text style={styles.infoValue}>
                        {exam.passScore ?? "-"}点
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>制限時間</Text>
                    <Text style={styles.infoValue}>
                        {exam.timeLimitMinutes ?? "-"}分
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>公開状態</Text>
                    <Text
                        style={[
                            styles.infoValue,
                            exam.isPublished
                                ? styles.publishedText
                                : styles.unpublishedText,
                        ]}
                    >
                        {exam.isPublished ? "公開" : "非公開"}
                    </Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>学習モード</Text>

                <View style={styles.modeRow}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.modeCard,
                            mode === "PRACTICE" && styles.modeCardSelected,
                            pressed && styles.pressed,
                        ]}
                        onPress={() => setMode("PRACTICE")}
                    >
                        <Text
                            style={[
                                styles.modeTitle,
                                mode === "PRACTICE" && styles.modeTextSelected,
                            ]}
                        >
                            練習モード
                        </Text>
                        <Text
                            style={[
                                styles.modeDescription,
                                mode === "PRACTICE" && styles.modeTextSelected,
                            ]}
                        >
                            学習・復習向け
                        </Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [
                            styles.modeCard,
                            mode === "EXAM" && styles.modeCardSelected,
                            pressed && styles.pressed,
                        ]}
                        onPress={() => setMode("EXAM")}
                    >
                        <Text
                            style={[
                                styles.modeTitle,
                                mode === "EXAM" && styles.modeTextSelected,
                            ]}
                        >
                            本番モード
                        </Text>
                        <Text
                            style={[
                                styles.modeDescription,
                                mode === "EXAM" && styles.modeTextSelected,
                            ]}
                        >
                            試験形式で実施
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View style={styles.noticeBox}>
                <Text style={styles.noticeTitle}>開始前の確認</Text>
                <Text style={styles.noticeText}>
                    G検定対策として、練習モードでは解説を確認しながら学習できます。
                    本番モードでは模擬試験形式で回答できます。
                </Text>
            </View>

            <AppButton onPress={startQuiz}>
                {mode === "PRACTICE" ? "練習を開始" : "本番試験を開始"}
            </AppButton>

            <AppButton mode="outlined" onPress={() => navigation.goBack()}>
                戻る
            </AppButton>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        gap: 18,
        backgroundColor: "#ffffff",
    },
    header: {
        gap: 8,
    },
    examCode: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#4f5f6f",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1f2937",
        lineHeight: 32,
    },
    description: {
        fontSize: 14,
        color: "#4b5563",
        lineHeight: 22,
    },
    infoBox: {
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 12,
        backgroundColor: "#f8fafc",
        overflow: "hidden",
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
    },
    infoLabel: {
        fontSize: 14,
        color: "#6b7280",
        fontWeight: "600",
    },
    infoValue: {
        fontSize: 14,
        color: "#1f2937",
        fontWeight: "bold",
    },
    publishedText: {
        color: "#166534",
    },
    unpublishedText: {
        color: "#7f1d1d",
    },
    section: {
        gap: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1f2937",
    },
    modeRow: {
        flexDirection: "row",
        gap: 10,
    },
    modeCard: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#d8dce8",
        backgroundColor: "#ffffff",
        gap: 6,
    },
    modeCardSelected: {
        backgroundColor: "#4f5f6f",
        borderColor: "#4f5f6f",
    },
    modeTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#1f2937",
    },
    modeDescription: {
        fontSize: 12,
        color: "#6b7280",
        lineHeight: 18,
    },
    modeTextSelected: {
        color: "#ffffff",
    },
    noticeBox: {
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#f3f6f9",
        gap: 6,
    },
    noticeTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#1f2937",
    },
    noticeText: {
        fontSize: 13,
        color: "#4b5563",
        lineHeight: 20,
    },
    pressed: {
        opacity: 0.75,
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        gap: 10,
        padding: 20,
    },
    loadingText: {
        fontSize: 14,
        color: "#4b5563",
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1f2937",
    },
});
