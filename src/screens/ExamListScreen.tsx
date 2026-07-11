import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../components/AppButton";
import { client } from "../lib/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "ExamList">;

type ExamItem = {
    id: string;
    code?: string | null;
    title?: string | null;
    description?: string | null;
    passScore?: number | null;
    totalQuestions?: number | null;
};

export default function ExamListScreen({ navigation }: Props) {
    const [exams, setExams] = useState<ExamItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadExams = useCallback(async () => {
        setLoading(true);

        try {
            const result = await client.models.Exam.list({
                filter: {
                    isPublished: {
                        eq: true,
                    },
                },
            });

            setExams((result.data ?? []) as ExamItem[]);
        } catch (error) {
            console.error("Exam list error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadExams();
    }, [loadExams]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>問題セットを選択</Text>

            {loading && <Text>読み込み中...</Text>}

            <FlatList
                data={exams}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        公開済みの問題セットがありません。
                        先に管理者機能またはデータ登録で問題を作成してください。
                    </Text>
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Text style={styles.examTitle}>
                            {item.code} - {item.title}
                        </Text>

                        {!!item.description && (
                            <Text style={styles.description}>
                                {item.description}
                            </Text>
                        )}

                        <Text style={styles.meta}>
                            合格点: {item.passScore ?? "-"} / 問題数:{" "}
                            {item.totalQuestions ?? "-"}
                        </Text>

                        <AppButton
                            onPress={() =>
                                navigation.navigate("ExamStart", {
                                    examId: item.id,
                                })
                            }
                        >
                            開始
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
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 16,
        color: "#1f2937",
    },
    card: {
        padding: 16,
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 8,
        marginBottom: 12,
        gap: 8,
        backgroundColor: "#ffffff",
    },
    examTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1f2937",
    },
    description: {
        fontSize: 14,
        lineHeight: 22,
        color: "#4b5563",
    },
    meta: {
        fontSize: 13,
        color: "#6b7280",
    },
    emptyText: {
        fontSize: 14,
        lineHeight: 22,
        color: "#4b5563",
    },
});
