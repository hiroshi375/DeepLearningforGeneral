import { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../components/AppButton";
import { client } from "../lib/client";
import type { RootStackParamList } from "../navigation/RootNavigator";
import AdminOnly from "../components/AdminOnly";
type Props = NativeStackScreenProps<RootStackParamList, "AdminQuestionImport">;

function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let insideQuote = false;

    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];

        if (char === '"') {
            insideQuote = !insideQuote;
            continue;
        }

        if (char === "," && !insideQuote) {
            result.push(current.trim());
            current = "";
            continue;
        }

        current += char;
    }

    result.push(current.trim());
    return result;
}

export default function AdminQuestionImportScreen({ navigation }: Props) {
    const [csvText, setCsvText] = useState("");
    const [importing, setImporting] = useState(false);

    const importCsv = async () => {
        const lines = csvText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (lines.length === 0) {
            Alert.alert("未入力", "CSVを貼り付けてください。");
            return;
        }

        setImporting(true);

        try {
            let successCount = 0;

            for (const line of lines) {
                const [
                    examId,
                    questionText,
                    category,
                    difficulty,
                    questionType,
                    correctLabelsText,
                    explanationText,
                    ...choiceTexts
                ] = parseCsvLine(line);

                if (!examId || !questionText || choiceTexts.length < 2) {
                    continue;
                }

                const validChoiceTexts = choiceTexts.filter(Boolean);

                const questionResult = await client.models.Question.create({
                    examId,
                    questionText,
                    category: category || undefined,
                    difficulty: difficulty || undefined,
                    questionType: questionType || "SINGLE",
                    selectionMax:
                        questionType === "MULTIPLE"
                            ? correctLabelsText.split("|").length
                            : 1,
                    score: 1,
                    status: "PUBLISHED",
                });

                const questionId = questionResult.data?.id;

                if (!questionId) {
                    continue;
                }

                const labelToChoiceId = new Map<string, string>();

                for (
                    let index = 0;
                    index < validChoiceTexts.length;
                    index += 1
                ) {
                    const label = String.fromCharCode(65 + index);

                    const choiceResult = await client.models.Choice.create({
                        questionId,
                        label,
                        choiceText: validChoiceTexts[index],
                        displayOrder: index + 1,
                    });

                    if (choiceResult.data?.id) {
                        labelToChoiceId.set(label, choiceResult.data.id);
                    }
                }

                const correctLabels = correctLabelsText
                    .split("|")
                    .map((value) => value.trim().toUpperCase())
                    .filter(Boolean);

                const correctChoiceIds = correctLabels
                    .map((label) => labelToChoiceId.get(label))
                    .filter((id): id is string => Boolean(id));

                await client.models.QuestionSolution.create({
                    questionId,
                    correctChoiceIds,
                    explanationText: explanationText || undefined,
                });

                successCount += 1;
            }

            Alert.alert("インポート完了", `${successCount}件登録しました。`, [
                {
                    text: "問題一覧へ",
                    onPress: () => navigation.navigate("AdminQuestionList"),
                },
            ]);
        } catch (error) {
            console.error("CSV import error:", error);
            Alert.alert("エラー", "CSVインポートに失敗しました。");
        } finally {
            setImporting(false);
        }
    };

    return (
        <AdminOnly onBack={() => navigation.navigate("Home")}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.title}>問題一括登録</Text>

                    <Text style={styles.description}>
                        以下の形式でCSVを貼り付けてください。
                    </Text>

                    <Text style={styles.format}>
                        examId,questionText,category,difficulty,questionType,correctLabels,explanation,A,B,C,D
                    </Text>

                    <Text style={styles.description}>
                        複数正解の場合は correctLabels を A|C
                        のように入力します。
                    </Text>

                    <TextInput
                        value={csvText}
                        onChangeText={setCsvText}
                        multiline
                        style={styles.textArea}
                        placeholder="CSVを貼り付け"
                    />

                    <AppButton disabled={importing} onPress={importCsv}>
                        {importing ? "登録中..." : "インポートする"}
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
    description: {
        fontSize: 14,
        lineHeight: 22,
        color: "#4b5563",
    },
    format: {
        fontSize: 12,
        lineHeight: 20,
        color: "#1f2937",
        backgroundColor: "#f3f4f6",
        padding: 10,
        borderRadius: 8,
    },
    textArea: {
        minHeight: 260,
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 8,
        padding: 12,
        textAlignVertical: "top",
        backgroundColor: "#ffffff",
    },
});
