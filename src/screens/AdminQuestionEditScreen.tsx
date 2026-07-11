import { useCallback, useEffect, useMemo, useState } from "react";
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

type Props = NativeStackScreenProps<RootStackParamList, "AdminQuestionEdit">;

type QuestionItem = {
    id: string;
    examId?: string | null;
    questionText?: string | null;
    questionType?: string | null;
    selectionMax?: number | null;
    score?: number | null;
    category?: string | null;
    difficulty?: string | null;
    status?: string | null;
};

type ChoiceItem = {
    id: string;
    questionId?: string | null;
    label?: string | null;
    choiceText?: string | null;
    displayOrder?: number | null;
};

type SolutionItem = {
    id: string;
    questionId?: string | null;
    correctChoiceIds?: string[] | null;
    explanationText?: string | null;
};

export default function AdminQuestionEditScreen({ route, navigation }: Props) {
    const { questionId } = route.params;

    const [loading, setLoading] = useState(true);
    const [question, setQuestion] = useState<QuestionItem | null>(null);
    const [choices, setChoices] = useState<ChoiceItem[]>([]);
    const [solution, setSolution] = useState<SolutionItem | null>(null);

    const [questionText, setQuestionText] = useState("");
    const [questionType, setQuestionType] = useState<"SINGLE" | "MULTIPLE">(
        "SINGLE",
    );
    const [selectionMax, setSelectionMax] = useState("1");
    const [score, setScore] = useState("1");
    const [category, setCategory] = useState("");
    const [difficulty, setDifficulty] = useState("NORMAL");
    const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
    const [correctLabelsText, setCorrectLabelsText] = useState("");
    const [explanationText, setExplanationText] = useState("");
    const [saving, setSaving] = useState(false);

    const loadQuestion = useCallback(async () => {
        setLoading(true);

        try {
            const questionResult = await client.models.Question.get({
                id: questionId,
            });

            const loadedQuestion = questionResult.data as QuestionItem | null;

            if (!loadedQuestion) {
                Alert.alert("エラー", "問題が見つかりませんでした。");
                return;
            }

            setQuestion(loadedQuestion);
            setQuestionText(loadedQuestion.questionText ?? "");
            setQuestionType(
                loadedQuestion.questionType === "MULTIPLE"
                    ? "MULTIPLE"
                    : "SINGLE",
            );
            setSelectionMax(String(loadedQuestion.selectionMax ?? 1));
            setScore(String(loadedQuestion.score ?? 1));
            setCategory(loadedQuestion.category ?? "");
            setDifficulty(loadedQuestion.difficulty ?? "NORMAL");
            setStatus(
                loadedQuestion.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
            );

            const choiceResult = await client.models.Choice.list({
                filter: {
                    questionId: {
                        eq: questionId,
                    },
                },
            });

            const loadedChoices = (
                (choiceResult.data ?? []) as ChoiceItem[]
            ).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

            setChoices(loadedChoices);

            const solutionResult = await client.models.QuestionSolution.list({
                filter: {
                    questionId: {
                        eq: questionId,
                    },
                },
            });

            const loadedSolution =
                ((solutionResult.data ?? []) as SolutionItem[])[0] ?? null;

            setSolution(loadedSolution);
            setExplanationText(loadedSolution?.explanationText ?? "");

            const correctChoiceIds = loadedSolution?.correctChoiceIds ?? [];
            const correctLabels = loadedChoices
                .filter((choice) => correctChoiceIds.includes(choice.id))
                .map((choice) => choice.label)
                .filter(Boolean);

            setCorrectLabelsText(correctLabels.join(","));
        } catch (error) {
            console.error("Question load error:", error);
            Alert.alert("エラー", "問題の取得に失敗しました。");
        } finally {
            setLoading(false);
        }
    }, [questionId]);

    useEffect(() => {
        void loadQuestion();
    }, [loadQuestion]);

    const correctLabels = useMemo(() => {
        return correctLabelsText
            .split(",")
            .map((value) => value.trim().toUpperCase())
            .filter(Boolean);
    }, [correctLabelsText]);

    const updateChoiceText = (choiceId: string, text: string) => {
        setChoices((prev) =>
            prev.map((choice) =>
                choice.id === choiceId
                    ? { ...choice, choiceText: text }
                    : choice,
            ),
        );
    };

    const saveQuestion = async () => {
        if (!question) {
            return;
        }

        if (!questionText.trim()) {
            Alert.alert("未入力", "問題文を入力してください。");
            return;
        }

        setSaving(true);

        try {
            await client.models.Question.update({
                id: question.id,
                questionText: questionText.trim(),
                questionType,
                selectionMax:
                    questionType === "MULTIPLE"
                        ? Number(selectionMax || correctLabels.length)
                        : 1,
                score: Number(score || 1),
                category: category.trim() || undefined,
                difficulty: difficulty.trim() || undefined,
                status,
            });

            for (let index = 0; index < choices.length; index += 1) {
                const choice = choices[index];

                await client.models.Choice.update({
                    id: choice.id,
                    label: choice.label ?? String.fromCharCode(65 + index),
                    choiceText: choice.choiceText ?? "",
                    displayOrder: index + 1,
                });
            }

            const correctChoiceIds = choices
                .filter((choice) =>
                    correctLabels.includes((choice.label ?? "").toUpperCase()),
                )
                .map((choice) => choice.id);

            if (solution?.id) {
                await client.models.QuestionSolution.update({
                    id: solution.id,
                    correctChoiceIds,
                    explanationText: explanationText.trim() || undefined,
                });
            } else {
                await client.models.QuestionSolution.create({
                    questionId,
                    correctChoiceIds,
                    explanationText: explanationText.trim() || undefined,
                });
            }

            Alert.alert("保存完了", "問題を更新しました。", [
                {
                    text: "一覧へ戻る",
                    onPress: () => navigation.navigate("AdminQuestionList"),
                },
            ]);
        } catch (error) {
            console.error("Question update error:", error);
            Alert.alert("エラー", "問題の更新に失敗しました。");
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

    if (!question) {
        return (
            <View style={styles.center}>
                <Text>問題がありません。</Text>
            </View>
        );
    }

    return (
        <AdminOnly onBack={() => navigation.navigate("Home")}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.title}>問題編集</Text>

                    <Text style={styles.label}>問題文</Text>
                    <TextInput
                        value={questionText}
                        onChangeText={setQuestionText}
                        multiline
                        style={[styles.input, styles.textArea]}
                    />

                    <Text style={styles.label}>カテゴリ</Text>
                    <TextInput
                        value={category}
                        onChangeText={setCategory}
                        style={styles.input}
                    />

                    <Text style={styles.label}>難易度</Text>
                    <TextInput
                        value={difficulty}
                        onChangeText={setDifficulty}
                        style={styles.input}
                    />

                    <View style={styles.row}>
                        <Text style={styles.label}>複数選択</Text>
                        <Switch
                            value={questionType === "MULTIPLE"}
                            onValueChange={(value) =>
                                setQuestionType(value ? "MULTIPLE" : "SINGLE")
                            }
                        />
                    </View>

                    {questionType === "MULTIPLE" && (
                        <>
                            <Text style={styles.label}>最大選択数</Text>
                            <TextInput
                                value={selectionMax}
                                onChangeText={setSelectionMax}
                                keyboardType="number-pad"
                                style={styles.input}
                            />
                        </>
                    )}

                    <Text style={styles.label}>配点</Text>
                    <TextInput
                        value={score}
                        onChangeText={setScore}
                        keyboardType="number-pad"
                        style={styles.input}
                    />

                    <View style={styles.row}>
                        <Text style={styles.label}>
                            状態: {status === "PUBLISHED" ? "公開" : "下書き"}
                        </Text>
                        <Switch
                            value={status === "PUBLISHED"}
                            onValueChange={(value) =>
                                setStatus(value ? "PUBLISHED" : "DRAFT")
                            }
                        />
                    </View>

                    <Text style={styles.label}>選択肢</Text>
                    {choices.map((choice) => (
                        <View key={choice.id} style={styles.choiceRow}>
                            <Text style={styles.choiceLabel}>
                                {choice.label}
                            </Text>
                            <TextInput
                                value={choice.choiceText ?? ""}
                                onChangeText={(text) =>
                                    updateChoiceText(choice.id, text)
                                }
                                style={[styles.input, styles.choiceInput]}
                            />
                        </View>
                    ))}

                    <Text style={styles.label}>正解ラベル</Text>
                    <TextInput
                        value={correctLabelsText}
                        onChangeText={setCorrectLabelsText}
                        style={styles.input}
                        placeholder="例: A / A,C"
                    />

                    <Text style={styles.label}>解説</Text>
                    <TextInput
                        value={explanationText}
                        onChangeText={setExplanationText}
                        multiline
                        style={[styles.input, styles.textArea]}
                    />

                    <AppButton disabled={saving} onPress={saveQuestion}>
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
        fontSize: 15,
    },
    textArea: {
        minHeight: 110,
        textAlignVertical: "top",
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    choiceRow: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
    },
    choiceLabel: {
        width: 28,
        fontSize: 18,
        fontWeight: "800",
    },
    choiceInput: {
        flex: 1,
    },
});
