import { useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../components/AppButton";
import { client } from "../lib/client";
import type { RootStackParamList } from "../navigation/RootNavigator";
import AdminOnly from "../components/AdminOnly";
import * as FileSystem from "expo-file-system/legacy";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

type Props = NativeStackScreenProps<RootStackParamList, "AdminQuestionImport">;
type ExamItem = {
    id: string;
    code?: string | null;
    title?: string | null;
};
type QuestionItem = {
    id: string;
    examId?: string | null;
    questionNo?: number | null;
    questionText?: string | null;
    category?: string | null;
    difficulty?: string | null;
    questionType?: string | null;
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

const CSV_TEMPLATE_HEADER =
    "examCode,questionNo,questionText,category,difficulty,questionType,correctLabels,explanation,A,B,C,D";

const CSV_TEMPLATE_SAMPLE =
    'G-001,1,"ディープラーニングに関する説明として正しいものはどれか",ディープラーニング,NORMAL,SINGLE,A,"多層のニューラルネットワークを用いる手法です","多層のニューラルネットワークを用いる手法","ルールベースのみで判断する手法","データベースの正規化手法","画面デザインの手法"';

const CSV_TEMPLATE_TEXT = `${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_SAMPLE}\n`;

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

function escapeCsvValue(value: string | number | null | undefined): string {
    const text = value == null ? "" : String(value);

    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
        return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
}

async function loadExamCodeById(examId: string | null | undefined) {
    if (!examId) {
        return "";
    }

    try {
        const result = await client.models.Exam.get({
            id: examId,
        });

        const exam = result.data as ExamItem | null;

        return exam?.code ?? "";
    } catch (error) {
        console.error("Load exam code error:", error);
        return "";
    }
}

async function loadExamIdByCode(examCode: string) {
    const normalizedExamCode = examCode.replace(/^\uFEFF/, "").trim();

    if (!normalizedExamCode) {
        return null;
    }

    try {
        const result = await client.models.Exam.list({
            filter: {
                code: {
                    eq: normalizedExamCode,
                },
            },
        });

        const exam = ((result.data ?? []) as ExamItem[])[0] ?? null;

        return exam?.id ?? null;
    } catch (error) {
        console.error("Load exam id by code error:", error);
        return null;
    }
}

async function loadQuestionByExamAndNo(examId: string, questionNo: number) {
    try {
        const result = await client.models.Question.list({
            filter: {
                examId: {
                    eq: examId,
                },
                questionNo: {
                    eq: questionNo,
                },
            },
        });

        if (result.errors) {
            console.error(
                "[ImportQuestions] load existing question errors:",
                result.errors,
            );
            return null;
        }

        return ((result.data ?? []) as QuestionItem[])[0] ?? null;
    } catch (error) {
        console.error("[ImportQuestions] load existing question error:", error);
        return null;
    }
}

async function updateExamTotalQuestions(examId: string) {
    try {
        const result = await client.models.Question.list({
            filter: {
                examId: {
                    eq: examId,
                },
            },
        });

        if (result.errors) {
            console.error(
                "[ImportQuestions] count questions errors:",
                result.errors,
            );
            return;
        }

        const totalQuestions = result.data?.length ?? 0;

        console.log("[ImportQuestions] update exam totalQuestions:", {
            examId,
            totalQuestions,
        });

        const updateResult = await client.models.Exam.update({
            id: examId,
            totalQuestions,
        });

        if (updateResult.errors) {
            console.error(
                "[ImportQuestions] update exam errors:",
                updateResult.errors,
            );
        }
    } catch (error) {
        console.error(
            "[ImportQuestions] update exam totalQuestions error:",
            error,
        );
    }
}

export default function AdminQuestionImportScreen({ navigation }: Props) {
    const [importing, setImporting] = useState(false);

    const saveOrShareCsvFile = async ({
        filename,
        csvText,
        shareDialogTitle,
    }: {
        filename: string;
        csvText: string;
        shareDialogTitle: string;
    }) => {
        if (Platform.OS === "android") {
            const permission =
                await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert(
                    "保存をキャンセルしました",
                    "CSVファイルを保存するには、保存先フォルダを選択してください。",
                );
                return;
            }

            const fileUri =
                await FileSystem.StorageAccessFramework.createFileAsync(
                    permission.directoryUri,
                    filename,
                    "text/csv",
                );

            await FileSystem.writeAsStringAsync(fileUri, csvText, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            Alert.alert("保存完了", `${filename} を保存しました。`);
            return;
        }

        const isAvailable = await Sharing.isAvailableAsync();

        if (!isAvailable) {
            Alert.alert(
                "共有できません",
                "この端末ではファイル共有機能を利用できません。",
            );
            return;
        }

        const file = new File(Paths.cache, filename);

        if (file.exists) {
            file.delete();
        }

        file.create();
        file.write(csvText);

        await Sharing.shareAsync(file.uri, {
            mimeType: "text/csv",
            dialogTitle: shareDialogTitle,
        });
    };

    const exportCsvFormat = async () => {
        try {
            await saveOrShareCsvFile({
                filename: "g_exam_question_import_format.csv",
                csvText: `\uFEFF${CSV_TEMPLATE_TEXT}`,
                shareDialogTitle: "CSVフォーマットをエクスポート",
            });
        } catch (error) {
            console.error("CSV format export error:", error);
            Alert.alert(
                "エラー",
                "CSVフォーマットのエクスポートに失敗しました。",
            );
        }
    };

    const exportRegisteredQuestions = async () => {
        console.log("[ExportQuestions] start");

        try {
            console.log("[ExportQuestions] fetching questions");

            const questionResult = await client.models.Question.list();

            console.log(
                "[ExportQuestions] question errors:",
                questionResult.errors,
            );
            console.log(
                "[ExportQuestions] question count:",
                questionResult.data?.length ?? 0,
            );

            const questions = (
                (questionResult.data ?? []) as QuestionItem[]
            ).sort((a, b) => {
                const examCompare = (a.examId ?? "").localeCompare(
                    b.examId ?? "",
                );
                if (examCompare !== 0) {
                    return examCompare;
                }

                return (a.questionNo ?? 0) - (b.questionNo ?? 0);
            });

            if (questions.length === 0) {
                Alert.alert("対象なし", "エクスポートできる問題がありません。");
                return;
            }

            const lines: string[] = [CSV_TEMPLATE_HEADER];

            for (const question of questions) {
                console.log("[ExportQuestions] processing question:", {
                    id: question.id,
                    examId: question.examId,
                    questionText: question.questionText?.slice(0, 40),
                });

                const choiceResult = await client.models.Choice.list({
                    filter: {
                        questionId: {
                            eq: question.id,
                        },
                    },
                });

                console.log(
                    "[ExportQuestions] choice errors:",
                    choiceResult.errors,
                );
                console.log(
                    "[ExportQuestions] choice count:",
                    question.id,
                    choiceResult.data?.length ?? 0,
                );

                const choices = (
                    (choiceResult.data ?? []) as ChoiceItem[]
                ).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

                const solutionResult =
                    await client.models.QuestionSolution.list({
                        filter: {
                            questionId: {
                                eq: question.id,
                            },
                        },
                    });

                console.log(
                    "[ExportQuestions] solution errors:",
                    solutionResult.errors,
                );
                console.log(
                    "[ExportQuestions] solution count:",
                    question.id,
                    solutionResult.data?.length ?? 0,
                );

                const solution =
                    ((solutionResult.data ?? []) as SolutionItem[])[0] ?? null;

                const correctChoiceIds = solution?.correctChoiceIds ?? [];

                const correctLabels = choices
                    .filter((choice) => correctChoiceIds.includes(choice.id))
                    .map((choice) => choice.label ?? "")
                    .filter(Boolean)
                    .join("|");

                const choiceTexts = choices.map(
                    (choice) => choice.choiceText ?? "",
                );

                while (choiceTexts.length < 4) {
                    choiceTexts.push("");
                }

                const examCode = await loadExamCodeById(question.examId);

                const row = [
                    examCode,
                    question.questionNo ?? "",
                    question.questionText ?? "",
                    question.category ?? "",
                    question.difficulty ?? "",
                    question.questionType ?? "SINGLE",
                    correctLabels,
                    solution?.explanationText ?? "",
                    ...choiceTexts,
                ];

                lines.push(row.map(escapeCsvValue).join(","));
            }

            const csvText = `\uFEFF${lines.join("\n")}\n`;

            console.log("[ExportQuestions] csv line count:", lines.length);
            console.log("[ExportQuestions] csv length:", csvText.length);
            console.log(
                "[ExportQuestions] csv preview:",
                csvText.slice(0, 300),
            );

            const now = new Date();
            const timestamp = [
                now.getFullYear(),
                String(now.getMonth() + 1).padStart(2, "0"),
                String(now.getDate()).padStart(2, "0"),
                "_",
                String(now.getHours()).padStart(2, "0"),
                String(now.getMinutes()).padStart(2, "0"),
            ].join("");

            const filename = `g_exam_questions_${timestamp}.csv`;

            await saveOrShareCsvFile({
                filename,
                csvText,
                shareDialogTitle: "登録済み問題をエクスポート",
            });
            console.log("[ExportQuestions] export completed");
        } catch (error) {
            console.error("[ExportQuestions] error:", error);
            Alert.alert("エラー", "登録済み問題のエクスポートに失敗しました。");
        }
    };

    const importCsvText = async (selectedCsvText: string) => {
        console.log("[ImportQuestions] importCsvText start");
        console.log(
            "[ImportQuestions] raw csv length:",
            selectedCsvText.length,
        );
        console.log(
            "[ImportQuestions] raw csv preview:",
            selectedCsvText.slice(0, 300),
        );
        const normalizedCsvText = selectedCsvText.replace(/^\uFEFF/, "");

        const lines = normalizedCsvText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        if (lines.length === 0) {
            Alert.alert("未入力", "CSVファイルにデータがありません。");
            return;
        }

        console.log("[ImportQuestions] lines count:", lines.length);
        console.log("[ImportQuestions] first line:", lines[0]);

        // ヘッダー行を除外
        const dataLines = lines.filter((line, index) => {
            if (index !== 0) {
                return true;
            }

            const firstLine = line.replace(/^\uFEFF/, "").toLowerCase();

            return (
                !firstLine.startsWith("examcode,questionno,questiontext") &&
                !firstLine.startsWith("examcode,questiontext") &&
                !firstLine.startsWith("examid,questiontext")
            );
        });

        console.log("[ImportQuestions] data lines count:", dataLines.length);
        console.log("[ImportQuestions] first data line:", dataLines[0]);

        if (dataLines.length === 0) {
            Alert.alert("対象なし", "インポートできる問題データがありません。");
            return;
        }

        setImporting(true);

        try {
            let skipCount = 0;
            let createCount = 0;
            let updateCount = 0;

            const importedExamIds = new Set<string>();

            for (const line of dataLines) {
                console.log("[ImportQuestions] processing line:", line);
                const [
                    examCode,
                    questionNoText,
                    questionText,
                    category,
                    difficulty,
                    questionType,
                    correctLabelsText,
                    explanationText,
                    ...choiceTexts
                ] = parseCsvLine(line);

                const questionNo = Number(questionNoText);

                console.log("[ImportQuestions] parsed row:", {
                    examCode,
                    questionText,
                    category,
                    difficulty,
                    questionType,
                    correctLabelsText,
                    explanationText,
                    choiceTextsCount: choiceTexts.length,
                    choiceTexts,
                });

                if (
                    !examCode ||
                    !Number.isInteger(questionNo) ||
                    questionNo <= 0 ||
                    !questionText ||
                    choiceTexts.length < 2
                ) {
                    skipCount += 1;
                    continue;
                }

                const examId = await loadExamIdByCode(examCode);

                console.log("[ImportQuestions] resolved exam:", {
                    examCode,
                    examId,
                });

                if (!examId) {
                    console.warn(
                        "[ImportQuestions] exam code not found:",
                        examCode,
                    );
                    skipCount += 1;
                    continue;
                }

                const validChoiceTexts = choiceTexts.filter(Boolean);

                if (validChoiceTexts.length < 2) {
                    skipCount += 1;
                    continue;
                }

                const normalizedQuestionType =
                    questionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE";

                const correctLabels = correctLabelsText
                    .split("|")
                    .map((value) => value.trim().toUpperCase())
                    .filter(Boolean);

                if (correctLabels.length === 0) {
                    skipCount += 1;
                    continue;
                }

                const existingQuestion = await loadQuestionByExamAndNo(
                    examId,
                    questionNo,
                );

                const wasUpdated = Boolean(existingQuestion?.id);

                let questionId: string | null = null;

                if (existingQuestion?.id) {
                    console.log("[ImportQuestions] update existing question:", {
                        examCode,
                        examId,
                        questionNo,
                        questionId: existingQuestion.id,
                    });

                    const updateResult = await client.models.Question.update({
                        id: existingQuestion.id,
                        examId,
                        questionNo,
                        questionText,
                        category: category || undefined,
                        difficulty: difficulty || undefined,
                        questionType: normalizedQuestionType,
                        selectionMax:
                            normalizedQuestionType === "MULTIPLE"
                                ? correctLabels.length
                                : 1,
                        score: 1,
                        status: "PUBLISHED",
                    });

                    if (updateResult.errors) {
                        console.error(
                            "[ImportQuestions] question update errors:",
                            updateResult.errors,
                        );
                        skipCount += 1;
                        continue;
                    }

                    questionId = existingQuestion.id;

                    await deleteQuestionChildren(questionId);
                } else {
                    console.log("[ImportQuestions] create new question:", {
                        examCode,
                        examId,
                        questionNo,
                    });

                    const createResult = await client.models.Question.create({
                        examId,
                        questionNo,
                        questionText,
                        category: category || undefined,
                        difficulty: difficulty || undefined,
                        questionType: normalizedQuestionType,
                        selectionMax:
                            normalizedQuestionType === "MULTIPLE"
                                ? correctLabels.length
                                : 1,
                        score: 1,
                        status: "PUBLISHED",
                    });

                    if (createResult.errors) {
                        console.error(
                            "[ImportQuestions] question create errors:",
                            createResult.errors,
                        );
                        skipCount += 1;
                        continue;
                    }

                    questionId = createResult.data?.id ?? null;
                }

                if (!questionId) {
                    skipCount += 1;
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

                const correctChoiceIds = correctLabels
                    .map((label) => labelToChoiceId.get(label))
                    .filter((id): id is string => Boolean(id));

                if (correctChoiceIds.length === 0) {
                    skipCount += 1;
                    continue;
                }

                const solutionResult =
                    await client.models.QuestionSolution.create({
                        questionId,
                        correctChoiceIds,
                        explanationText: explanationText || undefined,
                    });

                if (solutionResult.errors) {
                    console.error(
                        "[ImportQuestions] solution create errors:",
                        solutionResult.errors,
                    );
                    skipCount += 1;
                    continue;
                }

                importedExamIds.add(examId);
                if (wasUpdated) {
                    updateCount += 1;
                } else {
                    createCount += 1;
                }
            }

            for (const importedExamId of importedExamIds) {
                await updateExamTotalQuestions(importedExamId);
            }

            Alert.alert(
                "インポート完了",
                `新規登録: ${createCount}件\n更新: ${updateCount}件${
                    skipCount > 0 ? `\nスキップ: ${skipCount}件` : ""
                }`,
                [
                    {
                        text: "問題一覧へ",
                        onPress: () => navigation.navigate("AdminQuestionList"),
                    },
                ],
            );
        } catch (error) {
            console.error("CSV import error:", error);
            Alert.alert("エラー", "CSVインポートに失敗しました。");
        } finally {
            setImporting(false);
        }
    };

    const importCsv = async () => {
        console.log("[ImportQuestions] importCsv start");
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    "text/csv",
                    "text/comma-separated-values",
                    "application/csv",
                    "text/plain",
                ],
                copyToCacheDirectory: true,
                multiple: false,
            });

            console.log("[ImportQuestions] picker result:", result);

            if (result.canceled) {
                console.log("[ImportQuestions] picker canceled");
                return;
            }

            const asset = result.assets[0];

            console.log("[ImportQuestions] picked asset:", {
                name: asset?.name,
                mimeType: asset?.mimeType,
                uri: asset?.uri,
                size: asset?.size,
            });

            if (!asset?.uri) {
                Alert.alert("エラー", "CSVファイルを読み込めませんでした。");
                return;
            }

            const pickedFile = new File(asset.uri);
            const selectedCsvText = pickedFile.textSync();

            console.log(
                "[ImportQuestions] selected csv length:",
                selectedCsvText.length,
            );
            console.log(
                "[ImportQuestions] selected csv preview:",
                selectedCsvText.slice(0, 300),
            );

            await importCsvText(selectedCsvText);
        } catch (error) {
            console.error("Pick CSV error:", error);
            Alert.alert(
                "エラー",
                "CSVファイルの選択または読み込みに失敗しました。",
            );
        }
    };

    async function deleteQuestionChildren(questionId: string) {
        const choiceResult = await client.models.Choice.list({
            filter: {
                questionId: {
                    eq: questionId,
                },
            },
        });

        for (const choice of (choiceResult.data ?? []) as ChoiceItem[]) {
            await client.models.Choice.delete({
                id: choice.id,
            });
        }

        const solutionResult = await client.models.QuestionSolution.list({
            filter: {
                questionId: {
                    eq: questionId,
                },
            },
        });

        for (const solution of (solutionResult.data ?? []) as SolutionItem[]) {
            await client.models.QuestionSolution.delete({
                id: solution.id,
            });
        }
    }

    return (
        <AdminOnly onBack={() => navigation.navigate("Home")}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.title}>問題一括登録</Text>

                    <Text style={styles.description}>
                        以下の形式のCSVをインポートしてください。
                    </Text>

                    <Text style={styles.format}>{CSV_TEMPLATE_HEADER}</Text>

                    <Text style={styles.description}>
                        複数正解の場合は correctLabels を A|C
                        のように入力します。
                    </Text>

                    <AppButton mode="outlined" onPress={exportCsvFormat}>
                        CSVフォーマットをエクスポート
                    </AppButton>

                    <AppButton
                        mode="outlined"
                        onPress={exportRegisteredQuestions}
                    >
                        問題文をエクスポートする
                    </AppButton>

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
});
