import { useEffect, useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Image,
    TextInput,
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
import * as ImagePicker from "expo-image-picker";
import { getCurrentUser } from "aws-amplify/auth";
import { uploadData } from "aws-amplify/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

type ExtractedChoice = {
    label: string;
    choiceText: string;
};

type ExtractedQuestion = {
    examCode: string;
    questionNo: number | null;
    questionText: string;
    category: string | null;
    difficulty: string;
    questionType: string;
    correctLabels: string[];
    explanation: string;
    choices: ExtractedChoice[];
};

type QuestionImportChoiceInput = {
    label: string;
    choiceText: string;
};

type QuestionImportInput = {
    examCode: string;
    questionNo: number | null;
    questionText: string;
    category?: string | null;
    difficulty?: string | null;
    questionType?: string | null;
    correctLabels: string[];
    explanation?: string | null;
    choices: QuestionImportChoiceInput[];
};

type SaveQuestionImportResult = {
    status: "created" | "updated" | "skipped";
    examId?: string;
};

const CSV_TEMPLATE_HEADER =
    "examCode,questionNo,questionText,category,difficulty,questionType,correctLabels,explanation,A,B,C,D";

const CSV_TEMPLATE_SAMPLE =
    'G-001,1,"ディープラーニングに関する説明として正しいものはどれか",ディープラーニング,NORMAL,SINGLE,A,"多層のニューラルネットワークを用いる手法です","多層のニューラルネットワークを用いる手法","ルールベースのみで判断する手法","データベースの正規化手法","画面デザインの手法"';

const CSV_TEMPLATE_TEXT = `${CSV_TEMPLATE_HEADER}\n${CSV_TEMPLATE_SAMPLE}\n`;

const PENDING_IMPORT_IMAGE_TYPE_KEY = "adminQuestionImport.pendingImageType";

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
    const [questionImageUri, setQuestionImageUri] = useState<string | null>(
        null,
    );
    const [explanationImageUri, setExplanationImageUri] = useState<
        string | null
    >(null);
    const [pendingImageType, setPendingImageType] = useState<
        "question" | "explanation" | null
    >(null);
    const [extracting, setExtracting] = useState(false);
    const [extractedQuestion, setExtractedQuestion] =
        useState<ExtractedQuestion | null>(null);

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

    const saveQuestionImportInput = async (
        input: QuestionImportInput,
    ): Promise<SaveQuestionImportResult> => {
        const examCode = input.examCode.replace(/^\uFEFF/, "").trim();
        const questionNo = input.questionNo;
        const questionText = input.questionText.trim();

        if (
            !examCode ||
            !Number.isInteger(questionNo) ||
            questionNo == null ||
            questionNo <= 0 ||
            !questionText
        ) {
            return {
                status: "skipped",
            };
        }

        const examId = await loadExamIdByCode(examCode);

        console.log("[ImportQuestions] resolved exam:", {
            examCode,
            examId,
        });

        if (!examId) {
            console.warn("[ImportQuestions] exam code not found:", examCode);
            return {
                status: "skipped",
            };
        }

        const validChoices = input.choices
            .map((choice, index) => ({
                label:
                    choice.label?.trim().toUpperCase() ||
                    String.fromCharCode(65 + index),
                choiceText: choice.choiceText.trim(),
            }))
            .filter((choice) => choice.choiceText);

        if (validChoices.length < 2) {
            return {
                status: "skipped",
                examId,
            };
        }

        const normalizedQuestionType =
            input.questionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE";

        const correctLabels = input.correctLabels
            .map((label) => label.trim().toUpperCase())
            .filter(Boolean);

        if (correctLabels.length === 0) {
            return {
                status: "skipped",
                examId,
            };
        }

        const validChoiceLabels = new Set(
            validChoices.map((choice) => choice.label),
        );

        const hasInvalidCorrectLabel = correctLabels.some(
            (label) => !validChoiceLabels.has(label),
        );

        if (hasInvalidCorrectLabel) {
            console.warn("[ImportQuestions] invalid correct labels:", {
                correctLabels,
                validChoiceLabels: Array.from(validChoiceLabels),
            });

            return {
                status: "skipped",
                examId,
            };
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
                category: input.category || undefined,
                difficulty: input.difficulty || undefined,
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

                return {
                    status: "skipped",
                    examId,
                };
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
                category: input.category || undefined,
                difficulty: input.difficulty || undefined,
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

                return {
                    status: "skipped",
                    examId,
                };
            }

            questionId = createResult.data?.id ?? null;
        }

        if (!questionId) {
            return {
                status: "skipped",
                examId,
            };
        }

        const labelToChoiceId = new Map<string, string>();

        for (let index = 0; index < validChoices.length; index += 1) {
            const choice = validChoices[index];

            const choiceResult = await client.models.Choice.create({
                questionId,
                label: choice.label,
                choiceText: choice.choiceText,
                displayOrder: index + 1,
            });

            if (choiceResult.errors) {
                console.error(
                    "[ImportQuestions] choice create errors:",
                    choiceResult.errors,
                );
            }

            if (choiceResult.data?.id) {
                labelToChoiceId.set(choice.label, choiceResult.data.id);
            }
        }

        const correctChoiceIds = correctLabels
            .map((label) => labelToChoiceId.get(label))
            .filter((id): id is string => Boolean(id));

        if (correctChoiceIds.length === 0) {
            return {
                status: "skipped",
                examId,
            };
        }

        const solutionResult = await client.models.QuestionSolution.create({
            questionId,
            correctChoiceIds,
            explanationText: input.explanation || undefined,
        });

        if (solutionResult.errors) {
            console.error(
                "[ImportQuestions] solution create errors:",
                solutionResult.errors,
            );

            return {
                status: "skipped",
                examId,
            };
        }

        return {
            status: wasUpdated ? "updated" : "created",
            examId,
        };
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
                    questionNo,
                    questionText,
                    category,
                    difficulty,
                    questionType,
                    correctLabelsText,
                    explanationText,
                    choiceTextsCount: choiceTexts.length,
                    choiceTexts,
                });

                const correctLabels = correctLabelsText
                    .split("|")
                    .map((value) => value.trim().toUpperCase())
                    .filter(Boolean);

                const choices = choiceTexts
                    .map((choiceText, index) => ({
                        label: String.fromCharCode(65 + index),
                        choiceText,
                    }))
                    .filter((choice) => choice.choiceText.trim());

                const saveResult = await saveQuestionImportInput({
                    examCode,
                    questionNo,
                    questionText,
                    category,
                    difficulty,
                    questionType,
                    correctLabels,
                    explanation: explanationText,
                    choices,
                });

                if (saveResult.examId) {
                    importedExamIds.add(saveResult.examId);
                }

                if (saveResult.status === "created") {
                    createCount += 1;
                } else if (saveResult.status === "updated") {
                    updateCount += 1;
                } else {
                    skipCount += 1;
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

    const applyPickedImage = (
        imageType: "question" | "explanation",
        uri: string,
    ) => {
        if (imageType === "question") {
            setQuestionImageUri(uri);
            return;
        }

        setExplanationImageUri(uri);
    };

    const takeImage = async (imageType: "question" | "explanation") => {
        const permissionResult =
            await ImagePicker.requestCameraPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert(
                "権限が必要です",
                "カメラを使用するにはカメラ権限が必要です。",
            );
            return;
        }

        try {
            setPendingImageType(imageType);

            await AsyncStorage.setItem(
                PENDING_IMPORT_IMAGE_TYPE_KEY,
                imageType,
            );

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.9,
            });

            if (result.canceled || result.assets.length === 0) {
                return;
            }

            applyPickedImage(imageType, result.assets[0].uri);
        } finally {
            await AsyncStorage.removeItem(PENDING_IMPORT_IMAGE_TYPE_KEY);
            setPendingImageType(null);
        }
    };

    const takeQuestionImage = async () => {
        await takeImage("question");
    };

    const takeExplanationImage = async () => {
        await takeImage("explanation");
    };

    useEffect(() => {
        const restorePendingImagePickerResult = async () => {
            if (Platform.OS !== "android") {
                return;
            }

            try {
                const pendingResult = await ImagePicker.getPendingResultAsync();

                if (!pendingResult) {
                    return;
                }

                if (!("canceled" in pendingResult)) {
                    console.warn(
                        "ImagePicker pending result error:",
                        pendingResult,
                    );
                    return;
                }

                if (
                    pendingResult.canceled ||
                    pendingResult.assets.length === 0
                ) {
                    return;
                }

                const storedImageType = await AsyncStorage.getItem(
                    PENDING_IMPORT_IMAGE_TYPE_KEY,
                );

                const imageType =
                    storedImageType === "question" ||
                    storedImageType === "explanation"
                        ? storedImageType
                        : pendingImageType;

                const uri = pendingResult.assets[0].uri;

                if (imageType) {
                    applyPickedImage(imageType, uri);
                } else if (!questionImageUri) {
                    setQuestionImageUri(uri);
                } else if (!explanationImageUri) {
                    setExplanationImageUri(uri);
                }

                await AsyncStorage.removeItem(PENDING_IMPORT_IMAGE_TYPE_KEY);
            } catch (error) {
                console.error(
                    "Restore pending image picker result error:",
                    error,
                );
            }
        };

        void restorePendingImagePickerResult();
    }, [pendingImageType, questionImageUri, explanationImageUri]);

    const uploadImportImage = async (
        localUri: string,
        imageType: "question" | "explanation",
    ): Promise<string> => {
        const currentUser = await getCurrentUser();

        const response = await fetch(localUri);
        const blob = await response.blob();

        const path = `question-import-images/${currentUser.userId}/${Date.now()}-${imageType}.jpg`;

        await uploadData({
            path,
            data: blob,
            options: {
                contentType: "image/jpeg",
            },
        }).result;

        return path;
    };

    const extractQuestionFromImages = async () => {
        if (!questionImageUri || !explanationImageUri) {
            Alert.alert(
                "画像が不足しています",
                "問題画像と解説画像を撮影してください。",
            );
            return;
        }

        try {
            setExtracting(true);

            const questionImagePath = await uploadImportImage(
                questionImageUri,
                "question",
            );

            const explanationImagePath = await uploadImportImage(
                explanationImageUri,
                "explanation",
            );

            const result = await client.queries.extractQuestionFromImages({
                questionImagePath,
                explanationImagePath,
            });

            if (result.errors || !result.data) {
                console.error(
                    "extractQuestionFromImages errors:",
                    result.errors,
                );
                Alert.alert("エラー", "画像の読み取りに失敗しました。");
                return;
            }

            const parsed = JSON.parse(result.data) as ExtractedQuestion;
            setExtractedQuestion(parsed);
        } catch (error) {
            console.error("Extract question error:", error);
            Alert.alert("エラー", "画像の読み取りに失敗しました。");
        } finally {
            setExtracting(false);
        }
    };

    const saveExtractedQuestion = async () => {
        if (!extractedQuestion) {
            Alert.alert("未読み取り", "先に画像から問題を読み取ってください。");
            return;
        }

        if (
            !extractedQuestion.examCode.trim() ||
            !extractedQuestion.questionNo ||
            !extractedQuestion.questionText.trim()
        ) {
            Alert.alert(
                "入力不足",
                "試験コード、問題番号、問題文を入力してください。",
            );
            return;
        }

        try {
            setImporting(true);

            const saveResult = await saveQuestionImportInput({
                examCode: extractedQuestion.examCode,
                questionNo: extractedQuestion.questionNo,
                questionText: extractedQuestion.questionText,
                category: extractedQuestion.category,
                difficulty: extractedQuestion.difficulty,
                questionType: extractedQuestion.questionType,
                correctLabels: extractedQuestion.correctLabels,
                explanation: extractedQuestion.explanation,
                choices: extractedQuestion.choices,
            });

            if (saveResult.status === "skipped" || !saveResult.examId) {
                Alert.alert(
                    "登録できませんでした",
                    "試験コード、問題番号、選択肢、正解ラベルを確認してください。",
                );
                return;
            }

            await updateExamTotalQuestions(saveResult.examId);

            Alert.alert(
                "登録完了",
                saveResult.status === "updated"
                    ? "既存の問題を更新しました。"
                    : "新しい問題を登録しました。",
                [
                    {
                        text: "続けて登録",
                        onPress: () => {
                            setQuestionImageUri(null);
                            setExplanationImageUri(null);
                            setExtractedQuestion(null);
                        },
                    },
                    {
                        text: "問題一覧へ",
                        onPress: () => navigation.navigate("AdminQuestionList"),
                    },
                ],
            );
        } catch (error) {
            console.error("Save extracted question error:", error);
            Alert.alert("エラー", "読み取り結果の登録に失敗しました。");
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

                    <View style={styles.ocrSection}>
                        <Text style={styles.sectionTitle}>
                            画像から問題を作成
                        </Text>

                        <AppButton onPress={takeQuestionImage}>
                            問題画像を撮影
                        </AppButton>

                        {questionImageUri && (
                            <Image
                                source={{ uri: questionImageUri }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                        )}

                        <AppButton onPress={takeExplanationImage}>
                            解説画像を撮影
                        </AppButton>

                        {explanationImageUri && (
                            <Image
                                source={{ uri: explanationImageUri }}
                                style={styles.previewImage}
                                resizeMode="cover"
                            />
                        )}

                        <AppButton
                            onPress={extractQuestionFromImages}
                            disabled={
                                !questionImageUri ||
                                !explanationImageUri ||
                                extracting
                            }
                        >
                            {extracting
                                ? "読み取り中..."
                                : "画像から問題を読み取る"}
                        </AppButton>
                    </View>

                    {extractedQuestion && (
                        <View style={styles.extractedForm}>
                            <Text style={styles.sectionTitle}>
                                読み取り結果
                            </Text>

                            <Text style={styles.label}>試験コード</Text>
                            <TextInput
                                value={extractedQuestion.examCode}
                                onChangeText={(text) =>
                                    setExtractedQuestion((prev) =>
                                        prev
                                            ? { ...prev, examCode: text }
                                            : prev,
                                    )
                                }
                                style={styles.input}
                            />

                            <Text style={styles.label}>問題番号</Text>
                            <TextInput
                                value={
                                    extractedQuestion.questionNo == null
                                        ? ""
                                        : String(extractedQuestion.questionNo)
                                }
                                onChangeText={(text) =>
                                    setExtractedQuestion((prev) =>
                                        prev
                                            ? {
                                                  ...prev,
                                                  questionNo:
                                                      Number(text) || null,
                                              }
                                            : prev,
                                    )
                                }
                                keyboardType="number-pad"
                                style={styles.input}
                            />

                            <Text style={styles.label}>問題文</Text>
                            <TextInput
                                value={extractedQuestion.questionText}
                                onChangeText={(text) =>
                                    setExtractedQuestion((prev) =>
                                        prev
                                            ? { ...prev, questionText: text }
                                            : prev,
                                    )
                                }
                                style={[styles.input, styles.multilineInput]}
                                multiline
                            />

                            <Text style={styles.label}>選択肢</Text>

                            {extractedQuestion.choices.map((choice, index) => (
                                <View
                                    key={choice.label}
                                    style={styles.choiceEditRow}
                                >
                                    <Text style={styles.choiceLabel}>
                                        {choice.label}
                                    </Text>
                                    <TextInput
                                        value={choice.choiceText}
                                        onChangeText={(text) =>
                                            setExtractedQuestion((prev) => {
                                                if (!prev) {
                                                    return prev;
                                                }

                                                const nextChoices = [
                                                    ...prev.choices,
                                                ];
                                                nextChoices[index] = {
                                                    ...nextChoices[index],
                                                    choiceText: text,
                                                };

                                                return {
                                                    ...prev,
                                                    choices: nextChoices,
                                                };
                                            })
                                        }
                                        style={[
                                            styles.input,
                                            styles.choiceInput,
                                        ]}
                                        multiline
                                    />
                                </View>
                            ))}

                            <Text style={styles.label}>正解ラベル</Text>
                            <TextInput
                                value={extractedQuestion.correctLabels.join(
                                    "|",
                                )}
                                onChangeText={(text) =>
                                    setExtractedQuestion((prev) =>
                                        prev
                                            ? {
                                                  ...prev,
                                                  correctLabels: text
                                                      .split("|")
                                                      .map((label) =>
                                                          label
                                                              .trim()
                                                              .toUpperCase(),
                                                      )
                                                      .filter(Boolean),
                                              }
                                            : prev,
                                    )
                                }
                                placeholder="例: A または A|C"
                                style={styles.input}
                            />

                            <Text style={styles.label}>解説</Text>
                            <TextInput
                                value={extractedQuestion.explanation}
                                onChangeText={(text) =>
                                    setExtractedQuestion((prev) =>
                                        prev
                                            ? { ...prev, explanation: text }
                                            : prev,
                                    )
                                }
                                style={[styles.input, styles.multilineInput]}
                                multiline
                            />

                            <AppButton
                                disabled={importing}
                                onPress={saveExtractedQuestion}
                            >
                                {importing ? "登録中..." : "確認して登録"}
                            </AppButton>
                        </View>
                    )}
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

    ocrSection: {
        marginTop: 24,
        gap: 12,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#2f3349",
        marginBottom: 4,
    },

    previewImage: {
        width: "100%",
        height: 220,
        borderRadius: 8,
        backgroundColor: "#eef2f7",
    },

    extractedForm: {
        marginTop: 24,
        gap: 10,
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
        fontSize: 15,
        backgroundColor: "#ffffff",
        color: "#111827",
    },

    multilineInput: {
        minHeight: 120,
        textAlignVertical: "top",
    },

    choiceEditRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },

    choiceLabel: {
        width: 24,
        paddingTop: 12,
        fontSize: 16,
        fontWeight: "700",
        color: "#2f3349",
    },

    choiceInput: {
        flex: 1,
        minHeight: 64,
        textAlignVertical: "top",
    },
});
