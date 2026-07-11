import { useState } from "react";
import {
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

type Props = NativeStackScreenProps<RootStackParamList, "AdminExamCreate">;

export default function AdminExamCreateScreen({ navigation }: Props) {
    const [code, setCode] = useState("G-001");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("G検定");
    const [passScore, setPassScore] = useState("70");
    const [totalQuestions, setTotalQuestions] = useState("10");
    const [timeLimitMinutes, setTimeLimitMinutes] = useState("30");
    const [isPublished, setIsPublished] = useState(false);
    const [saving, setSaving] = useState(false);

    const saveExam = async () => {
        if (!code.trim() || !title.trim()) {
            Alert.alert("未入力", "コードとタイトルを入力してください。");
            return;
        }

        setSaving(true);

        try {
            const result = await client.models.Exam.create({
                code: code.trim(),
                title: title.trim(),
                description: description.trim() || undefined,
                category: category.trim() || undefined,
                passScore: Number(passScore || 70),
                totalQuestions: Number(totalQuestions || 0),
                timeLimitMinutes: Number(timeLimitMinutes || 0),
                isPublished,
            });

            if (result.errors) {
                console.error("Exam create errors:", result.errors);
                Alert.alert("エラー", "問題セットの登録に失敗しました。");
                return;
            }

            Alert.alert("登録完了", "問題セットを登録しました。", [
                {
                    text: "一覧へ",
                    onPress: () => navigation.navigate("AdminExamList"),
                },
            ]);
        } catch (error) {
            console.error("Exam create error:", error);
            Alert.alert("エラー", "問題セット登録中にエラーが発生しました。");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminOnly onBack={() => navigation.navigate("Home")}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.title}>問題セット登録</Text>

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
                        {saving ? "登録中..." : "登録する"}
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
