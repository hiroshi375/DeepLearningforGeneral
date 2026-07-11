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
type Props = NativeStackScreenProps<RootStackParamList, "AdminExamList">;

type ExamItem = {
    id: string;
    code?: string | null;
    title?: string | null;
    description?: string | null;
    passScore?: number | null;
    totalQuestions?: number | null;
    isPublished?: boolean | null;
};

export default function AdminExamListScreen({ navigation }: Props) {
    const [exams, setExams] = useState<ExamItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadExams = useCallback(async () => {
        setLoading(true);

        try {
            const result = await client.models.Exam.list();
            setExams((result.data ?? []) as ExamItem[]);
        } catch (error) {
            console.error("Exam list error:", error);
            Alert.alert("エラー", "問題セット一覧の取得に失敗しました。");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadExams();
    }, [loadExams]);

    const deleteExam = (examId: string) => {
        Alert.alert("削除確認", "この問題セットを削除しますか？", [
            { text: "キャンセル", style: "cancel" },
            {
                text: "削除",
                style: "destructive",
                onPress: async () => {
                    try {
                        await client.models.Exam.delete({ id: examId });
                        await loadExams();
                    } catch (error) {
                        console.error("Exam delete error:", error);
                        Alert.alert("エラー", "削除に失敗しました。");
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
                        <Text style={styles.title}>問題セット一覧</Text>
                        <AppButton
                            mode="outlined"
                            onPress={() =>
                                navigation.navigate("AdminExamCreate")
                            }
                        >
                            新規登録
                        </AppButton>
                    </View>

                    <FlatList
                        data={exams}
                        keyExtractor={(item) => item.id}
                        refreshControl={
                            <RefreshControl
                                refreshing={loading}
                                onRefresh={loadExams}
                            />
                        }
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>
                                問題セットがありません。
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

                                <Text style={styles.meta}>
                                    状態: {item.isPublished ? "公開" : "非公開"}
                                </Text>

                                <View style={styles.buttonRow}>
                                    <AppButton
                                        onPress={() =>
                                            navigation.navigate(
                                                "AdminExamEdit",
                                                {
                                                    examId: item.id,
                                                },
                                            )
                                        }
                                    >
                                        編集
                                    </AppButton>

                                    <AppButton
                                        mode="outlined"
                                        onPress={() => deleteExam(item.id)}
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
    },
    card: {
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        gap: 8,
    },
    examTitle: {
        fontSize: 18,
        fontWeight: "800",
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
    buttonRow: {
        flexDirection: "row",
        gap: 8,
    },
});
