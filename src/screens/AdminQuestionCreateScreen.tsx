import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Pressable,
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

type Props = NativeStackScreenProps<RootStackParamList, "AdminQuestionCreate">;

type ExamItem = {
    id: string;
    code?: string | null;
    title?: string | null;
};

type ChoiceInput = {
    label: string;
    choiceText: string;
};

const DEFAULT_CHOICES: ChoiceInput[] = [
    { label: "A", choiceText: "" },
    { label: "B", choiceText: "" },
    { label: "C", choiceText: "" },
    { label: "D", choiceText: "" },
];

export default function AdminQuestionCreateScreen({ navigation }: Props) {
    const [exams, setExams] = useState<ExamItem[]>([]);
    const [selectedExamId, setSelectedExamId] = useState("");
    const [questionText, setQuestionText] = useState("");
    const [questionNo, setQuestionNo] = useState("");
    const [questionType, setQuestionType] = useState<"SINGLE" | "MULTIPLE">(
        "SINGLE",
    );
    const [selectionMax, setSelectionMax] = useState("1");
    const [score, setScore] = useState("1");
    const [category, setCategory] = useState("");
    const [difficulty, setDifficulty] = useState("NORMAL");
    const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
    const [choices, setChoices] = useState<ChoiceInput[]>(DEFAULT_CHOICES);
    const [correctLabelsText, setCorrectLabelsText] = useState("A");
    const [explanationText, setExplanationText] = useState("");
    const [saving, setSaving] = useState(false);

    const loadExams = useCallback(async () => {
        try {
            const result = await client.models.Exam.list();
            const data = (result.data ?? []) as ExamItem[];
            setExams(data);
            if (!selectedExamId && data.length > 0) {
                setSelectedExamId(data[0].id);
            }
        } catch (error) {
            console.error("Exam load error:", error);
            Alert.alert("エラー", "問題セットの取得に失敗しました。");
        }
    }, [selectedExamId]);

    useEffect(() => {
        void loadExams();
    }, [loadExams]);

    const correctLabels = useMemo(() => {
        return correctLabelsText
            .split(",")
            .map((value) => value.trim().toUpperCase())
            .filter(Boolean);
    }, [correctLabelsText]);

    const updateChoiceText = (label: string, text: string) => {
        setChoices((prev) =>
            prev.map((choice) =>
                choice.label === label
                    ? { ...choice, choiceText: text }
                    : choice,
            ),
        );
    };

    const addChoice = () => {
        const nextLabel = String.fromCharCode(65 + choices.length);
        setChoices((prev) => [...prev, { label: nextLabel, choiceText: "" }]);
    };

    const saveQuestion = async () => {
        if (!selectedExamId) {
            Alert.alert("未選択", "問題セットを選択してください。");
            return;
        }
        const parsedQuestionNo = Number(questionNo);

        if (!Number.isInteger(parsedQuestionNo) || parsedQuestionNo <= 0) {
            Alert.alert(
                "入力エラー",
                "問題番号は1以上の整数で入力してください。",
            );
            return;
        }

        if (!questionText.trim()) {
            Alert.alert("未入力", "問題文を入力してください。");
            return;
        }

        const validChoices = choices.filter((choice) =>
            choice.choiceText.trim(),
        );

        if (validChoices.length < 2) {
            Alert.alert("未入力", "選択肢を2つ以上入力してください。");
            return;
        }

        if (correctLabels.length === 0) {
            Alert.alert("未入力", "正解ラベルを入力してください。");
            return;
        }

        const invalidCorrectLabels = correctLabels.filter(
            (label) => !validChoices.some((choice) => choice.label === label),
        );

        if (invalidCorrectLabels.length > 0) {
            Alert.alert(
                "正解ラベルエラー",
                `存在しない選択肢があります: ${invalidCorrectLabels.join(", ")}`,
            );
            return;
        }

        setSaving(true);

        try {
            const duplicateResult = await client.models.Question.list({
                filter: {
                    examId: {
                        eq: selectedExamId,
                    },
                    questionNo: {
                        eq: parsedQuestionNo,
                    },
                },
            });

            if ((duplicateResult.data?.length ?? 0) > 0) {
                Alert.alert(
                    "重複エラー",
                    "同じ問題セットに同じ問題番号の問題が既に登録されています。",
                );
                return;
            }

            const questionResult = await client.models.Question.create({
                examId: selectedExamId,
                questionNo: parsedQuestionNo,
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

            if (questionResult.errors || !questionResult.data?.id) {
                console.error("Question create errors:", questionResult.errors);
                Alert.alert("エラー", "問題の登録に失敗しました。");
                return;
            }

            const questionId = questionResult.data.id;
            const labelToChoiceId = new Map<string, string>();

            for (let index = 0; index < validChoices.length; index += 1) {
                const choice = validChoices[index];

                const choiceResult = await client.models.Choice.create({
                    questionId,
                    label: choice.label,
                    choiceText: choice.choiceText.trim(),
                    displayOrder: index + 1,
                });

                if (choiceResult.data?.id) {
                    labelToChoiceId.set(choice.label, choiceResult.data.id);
                }
            }

            const correctChoiceIds = correctLabels
                .map((label) => labelToChoiceId.get(label))
                .filter((id): id is string => Boolean(id));

            await client.models.QuestionSolution.create({
                questionId,
                correctChoiceIds,
                explanationText: explanationText.trim() || undefined,
            });

            Alert.alert("登録完了", "問題を登録しました。", [
                {
                    text: "一覧へ",
                    onPress: () => navigation.navigate("AdminQuestionList"),
                },
                {
                    text: "続けて登録",
                    onPress: () => {
                        setQuestionNo(String(parsedQuestionNo + 1));
                        setQuestionText("");
                        setChoices(DEFAULT_CHOICES);
                        setCorrectLabelsText("A");
                        setExplanationText("");
                    },
                },
            ]);
        } catch (error) {
            console.error("Question create unexpected error:", error);
            Alert.alert("エラー", "問題登録中にエラーが発生しました。");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminOnly onBack={() => navigation.navigate("Home")}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.title}>問題登録</Text>

                    <Text style={styles.label}>問題セット</Text>
                    <View style={styles.examList}>
                        {exams.map((exam) => (
                            <Pressable
                                key={exam.id}
                                onPress={() => setSelectedExamId(exam.id)}
                                style={[
                                    styles.examChip,
                                    selectedExamId === exam.id &&
                                        styles.examChipSelected,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.examChipText,
                                        selectedExamId === exam.id &&
                                            styles.examChipTextSelected,
                                    ]}
                                >
                                    {exam.code} {exam.title}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.label}>問題番号</Text>
                    <TextInput
                        value={questionNo}
                        onChangeText={setQuestionNo}
                        keyboardType="number-pad"
                        style={styles.input}
                        placeholder="例: 1"
                    />

                    <Text style={styles.label}>問題文</Text>
                    <TextInput
                        value={questionText}
                        onChangeText={setQuestionText}
                        multiline
                        style={[styles.input, styles.textArea]}
                        placeholder="問題文を入力"
                    />

                    <Text style={styles.label}>カテゴリ</Text>
                    <TextInput
                        value={category}
                        onChangeText={setCategory}
                        style={styles.input}
                        placeholder="例: 機械学習"
                    />

                    <Text style={styles.label}>難易度</Text>
                    <TextInput
                        value={difficulty}
                        onChangeText={setDifficulty}
                        style={styles.input}
                        placeholder="例: EASY / NORMAL / HARD"
                    />

                    <View style={styles.row}>
                        <Text style={styles.label}>複数選択</Text>
                        <Switch
                            value={questionType === "MULTIPLE"}
                            onValueChange={(value) => {
                                setQuestionType(value ? "MULTIPLE" : "SINGLE");
                                if (!value) {
                                    setSelectionMax("1");
                                }
                            }}
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

                    <Text style={styles.label}>公開状態</Text>
                    <View style={styles.row}>
                        <Text>
                            {status === "PUBLISHED" ? "公開" : "下書き"}
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
                        <View key={choice.label} style={styles.choiceRow}>
                            <Text style={styles.choiceLabel}>
                                {choice.label}
                            </Text>
                            <TextInput
                                value={choice.choiceText}
                                onChangeText={(text) =>
                                    updateChoiceText(choice.label, text)
                                }
                                style={[styles.input, styles.choiceInput]}
                                placeholder={`${choice.label} の選択肢`}
                            />
                        </View>
                    ))}

                    <AppButton mode="outlined" onPress={addChoice}>
                        選択肢を追加
                    </AppButton>

                    <Text style={styles.label}>正解ラベル</Text>
                    <TextInput
                        value={correctLabelsText}
                        onChangeText={setCorrectLabelsText}
                        style={styles.input}
                        placeholder="単一: A / 複数: A,C"
                    />

                    <Text style={styles.label}>解説</Text>
                    <TextInput
                        value={explanationText}
                        onChangeText={setExplanationText}
                        multiline
                        style={[styles.input, styles.textArea]}
                        placeholder="解説を入力"
                    />

                    <AppButton disabled={saving} onPress={saveQuestion}>
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
        fontSize: 15,
    },
    textArea: {
        minHeight: 110,
        textAlignVertical: "top",
    },
    examList: {
        gap: 8,
    },
    examChip: {
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 8,
        padding: 10,
    },
    examChipSelected: {
        backgroundColor: "#4b6f8f",
        borderColor: "#4b6f8f",
    },
    examChipText: {
        color: "#1f2937",
        fontWeight: "700",
    },
    examChipTextSelected: {
        color: "#ffffff",
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    choiceRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    choiceLabel: {
        width: 28,
        fontSize: 18,
        fontWeight: "800",
        color: "#1f2937",
    },
    choiceInput: {
        flex: 1,
    },
});
