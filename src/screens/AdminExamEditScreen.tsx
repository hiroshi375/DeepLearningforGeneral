import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../components/AppButton";
import { client } from "../lib/client";
import type { RootStackParamList } from "../navigation/RootNavigator";
import AdminOnly from "../components/AdminOnly";

type Props = NativeStackScreenProps<RootStackParamList, "AdminExamEdit">;

type ExamItem = {
    id: string;
    code?: string | null;
    title?: string | null;
    description?: string | null;
    category?: string | null;
    passScore?: number | null;
    totalQuestions?: number | null;
    timeLimitMinutes?: number | null;
    isPublished?: boolean | null;
};

export default function AdminExamEditScreen({ route, navigation }: Props) {
    const { examId } = route.params;

    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [passScore, setPassScore] = useState("70");
    const [totalQuestions, setTotalQuestions] = useState("0");
    const [timeLimitMinutes, setTimeLimitMinutes] = useState("0");
    const [isPublished, setIsPublished] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadExam = useCallback(async () => {
        setLoading(true);

        try {
            const result = await client.models.Exam.get({ id: examId });
            const exam = result.data as ExamItem | null;

            if (!exam) {
                Alert.alert("エラー", "問題セットが見つかりません。");
                return;
            }

            setCode(exam.code ?? "");
            setTitle(exam.title ?? "");
            setDescription(exam.description ?? "");
            setCategory(exam.category ?? "");
            setPassScore(String(exam.passScore ?? 70));
            setTotalQuestions(String(exam.totalQuestions ?? 0));
            setTimeLimitMinutes(String(exam.timeLimitMinutes ?? 0));
            setIsPublished(Boolean(exam.isPublished));
        } catch (error) {
            console.error("Exam get error:", error);
            Alert.alert("エラー", "問題セットの取得に失敗しました。");
        } finally {
            setLoading(false);
        }
    }, [examId]);

    useEffect(() => {
        void loadExam();
    }, [loadExam]);

    const saveExam = async () => {
        if (!code.trim() || !title.trim()) {
            Alert.alert("未入力", "コードとタイトルを入力してください。");
            return;
        }

        setSaving(true);

        try {
            await client.models.Exam.update({
                id: examId,
                code: code.trim(),
                title: title.trim(),
                description: description.trim() || undefined,
                category: category.trim() || undefined,
                passScore: Number(passScore || 70),
                totalQuestions: Number(totalQuestions || 0),
                timeLimitMinutes: Number(timeLimitMinutes || 0),
                isPublished,
            });

            Alert.alert("保存完了", "問題セットを更新しました。", [
                {
                    text: "一覧へ",
                    onPress: () => navigation.navigate("AdminExamList"),
                },
            ]);
        } catch (error) {
            console.error("Exam update error:", error);
            Alert.alert("エラー", "問題セットの更新に失敗しました。");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text>読み込み中...</Text>
            </View>
        );
    }

    return (
        <AdminOnly onBack={() => navigation.navigate("Home")}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.title}>問題セット編集</Text>

                    <Text style={styles.label}>コード</Text>
                    <TextInput
                        value={code}
                        onChangeText={setCode}
                        style={styles.input}
                    />

                    <Text style={styles.label}>タイトル</Text>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        style={styles.input}
                    />

                    <Text style={styles.label}>説明</Text>
                    <TextInput
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        style={[styles.input, styles.textArea]}
                    />

                    <Text style={styles.label}>カテゴリ</Text>
                    <TextInput
                        value={category}
                        onChangeText={setCategory}
                        style={styles.input}
                    />

                    <Text style={styles.label}>合格点</Text>
                    <TextInput
                        value={passScore}
                        onChangeText={setPassScore}
                        keyboardType="number-pad"
                        style={styles.input}
                    />

                    <Text style={styles.label}>問題数</Text>
                    <TextInput
                        value={totalQuestions}
                        onChangeText={setTotalQuestions}
                        keyboardType="number-pad"
                        style={styles.input}
                    />

                    <Text style={styles.label}>制限時間 分</Text>
                    <TextInput
                        value={timeLimitMinutes}
                        onChangeText={setTimeLimitMinutes}
                        keyboardType="number-pad"
                        style={styles.input}
                    />

                    <View style={styles.row}>
                        <Text style={styles.label}>
                            公開状態: {isPublished ? "公開" : "非公開"}
                        </Text>
                        <Switch
                            value={isPublished}
                            onValueChange={setIsPublished}
                        />
                    </View>

                    <AppButton disabled={saving} onPress={saveExam}>
                        {saving ? "保存中..." : "保存する"}
                    </AppButton>
                </ScrollView>
            </View>
        </AdminOnly>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 12,
        backgroundColor: "#ffffff",
    },
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1f2937",
    },
    label: {
        fontSize: 14,
        fontWeight: "700",
        color: "#374151",
    },
    input: {
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#ffffff",
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
});
