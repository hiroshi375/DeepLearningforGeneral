import { Buffer } from "buffer";
import {
    GetObjectCommand,
    S3Client,
    type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { env } from "$amplify/env/extractQuestionFromImages";

type ExtractQuestionFromImagesEvent = {
    arguments: {
        questionImagePath?: string | null;
        explanationImagePath?: string | null;
    };
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

type BedrockTextBlock = {
    type?: string;
    text?: string;
};

type BedrockClaudeResponse = {
    content?: BedrockTextBlock[];
};

const s3Client = new S3Client({});
const bedrockClient = new BedrockRuntimeClient({});

function getStorageBucketName() {
    const envRecord = env as unknown as Record<string, string | undefined>;

    const bucketName =
        envRecord.DEEP_LEARNING_FOR_GENERAL_STORAGE_BUCKET_NAME ??
        envRecord.deepLearningForGeneralStorage_BUCKET_NAME ??
        Object.entries(envRecord).find(([key]) =>
            key.endsWith("_BUCKET_NAME"),
        )?.[1];

    if (!bucketName) {
        console.error("Available env keys:", Object.keys(envRecord));
        throw new Error(
            "Storage bucket name environment variable was not found.",
        );
    }

    return bucketName;
}

async function bodyToBuffer(
    body: NonNullable<GetObjectCommandOutput["Body"]>,
): Promise<Buffer> {
    if (
        typeof body === "object" &&
        "transformToByteArray" in body &&
        typeof body.transformToByteArray === "function"
    ) {
        const bytes = await body.transformToByteArray();
        return Buffer.from(bytes);
    }

    const chunks: Buffer[] = [];

    for await (const chunk of body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
}

function normalizeMediaType(
    key: string,
    contentType?: string,
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
    const lowerContentType = contentType?.toLowerCase() ?? "";
    const lowerKey = key.toLowerCase();

    if (lowerContentType.includes("png") || lowerKey.endsWith(".png")) {
        return "image/png";
    }

    if (lowerContentType.includes("webp") || lowerKey.endsWith(".webp")) {
        return "image/webp";
    }

    if (lowerContentType.includes("gif") || lowerKey.endsWith(".gif")) {
        return "image/gif";
    }

    return "image/jpeg";
}

async function loadImageFromStorage(key: string) {
    const bucketName = getStorageBucketName();

    const result = await s3Client.send(
        new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        }),
    );

    if (!result.Body) {
        throw new Error(`S3 object body was empty: ${key}`);
    }

    const buffer = await bodyToBuffer(result.Body);
    const mediaType = normalizeMediaType(key, result.ContentType);

    return {
        base64: buffer.toString("base64"),
        mediaType,
        size: buffer.length,
    };
}

function extractJsonFromText(text: string) {
    const fencedJson = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const source = fencedJson?.[1] ?? text;

    const firstBraceIndex = source.indexOf("{");
    const lastBraceIndex = source.lastIndexOf("}");

    if (firstBraceIndex < 0 || lastBraceIndex < 0) {
        throw new Error(`Bedrock response did not contain JSON: ${text}`);
    }

    return source.slice(firstBraceIndex, lastBraceIndex + 1);
}

function normalizeExtractedQuestion(value: Partial<ExtractedQuestion>) {
    const choices = Array.isArray(value.choices)
        ? value.choices
              .map((choice, index) => ({
                  label:
                      choice?.label?.trim().toUpperCase() ||
                      String.fromCharCode(65 + index),
                  choiceText: choice?.choiceText?.trim() ?? "",
              }))
              .filter((choice) => choice.choiceText)
        : [];

    const correctLabels = Array.isArray(value.correctLabels)
        ? value.correctLabels
              .map((label) => String(label).trim().toUpperCase())
              .filter(Boolean)
        : [];

    const normalized: ExtractedQuestion = {
        examCode: value.examCode?.trim() || "G-001",
        questionNo:
            typeof value.questionNo === "number" &&
            Number.isInteger(value.questionNo)
                ? value.questionNo
                : null,
        questionText: value.questionText?.trim() ?? "",
        category: value.category?.trim() || null,
        difficulty: value.difficulty?.trim() || "NORMAL",
        questionType: value.questionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE",
        correctLabels,
        explanation: value.explanation?.trim() ?? "",
        choices,
    };

    return normalized;
}

function buildPrompt() {
    return `
あなたはG検定問題集アプリの問題登録補助AIです。

入力画像は2枚です。
- 1枚目: 問題画像
- 2枚目: 解説画像

画像から以下を読み取ってください。
- 問題文
- 選択肢A〜D
- 正解ラベル
- 解説文
- カテゴリ
- 難易度
- 問題形式

必ず以下のJSON形式だけを返してください。
説明文、Markdown、コードブロックは返さないでください。

{
  "examCode": "G-001",
  "questionNo": null,
  "questionText": "問題文",
  "category": "カテゴリ名。判断できない場合は null",
  "difficulty": "NORMAL",
  "questionType": "SINGLE",
  "correctLabels": ["A"],
  "explanation": "解説文",
  "choices": [
    { "label": "A", "choiceText": "選択肢A" },
    { "label": "B", "choiceText": "選択肢B" },
    { "label": "C", "choiceText": "選択肢C" },
    { "label": "D", "choiceText": "選択肢D" }
  ]
}

制約:
- examCode は不明なら "G-001" にしてください。
- questionNo は画像から明確に読めない場合 null にしてください。
- difficulty は "EASY", "NORMAL", "HARD" のどれかにしてください。不明なら "NORMAL" にしてください。
- questionType は単一選択なら "SINGLE"、複数選択なら "MULTIPLE" にしてください。
- correctLabels は必ず選択肢ラベルの配列にしてください。
- 正解が解説画像に明記されている場合は、それを優先してください。
- 正解が判断できない場合は空配列 [] にしてください。
- 選択肢の文言は省略せず、画像にある内容をできるだけ正確に転記してください。
`.trim();
}

export const handler = async (event: ExtractQuestionFromImagesEvent) => {
    console.log("extractQuestionFromImages event:", JSON.stringify(event));

    const { questionImagePath, explanationImagePath } = event.arguments;

    if (!questionImagePath || !explanationImagePath) {
        throw new Error(
            "questionImagePath and explanationImagePath are required.",
        );
    }

    console.log("questionImagePath:", questionImagePath);
    console.log("explanationImagePath:", explanationImagePath);

    const [questionImage, explanationImage] = await Promise.all([
        loadImageFromStorage(questionImagePath),
        loadImageFromStorage(explanationImagePath),
    ]);

    console.log("loaded image sizes:", {
        questionImageSize: questionImage.size,
        explanationImageSize: explanationImage.size,
        questionMediaType: questionImage.mediaType,
        explanationMediaType: explanationImage.mediaType,
    });

    const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 3000,
        temperature: 0,
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "1枚目は問題画像です。",
                    },
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: questionImage.mediaType,
                            data: questionImage.base64,
                        },
                    },
                    {
                        type: "text",
                        text: "2枚目は解説画像です。",
                    },
                    {
                        type: "image",
                        source: {
                            type: "base64",
                            media_type: explanationImage.mediaType,
                            data: explanationImage.base64,
                        },
                    },
                    {
                        type: "text",
                        text: buildPrompt(),
                    },
                ],
            },
        ],
    };

    const response = await bedrockClient.send(
        new InvokeModelCommand({
            modelId: env.BEDROCK_MODEL_ID,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(requestBody),
        }),
    );

    const responseText = new TextDecoder().decode(response.body);
    console.log("Bedrock raw response:", responseText);

    const bedrockResponse = JSON.parse(responseText) as BedrockClaudeResponse;

    const answerText =
        bedrockResponse.content
            ?.filter((block) => block.type === "text" && block.text)
            .map((block) => block.text)
            .join("\n") ?? "";

    console.log("Bedrock answer text:", answerText);

    const jsonText = extractJsonFromText(answerText);
    const parsed = JSON.parse(jsonText) as Partial<ExtractedQuestion>;
    const normalized = normalizeExtractedQuestion(parsed);

    console.log("Normalized extracted question:", JSON.stringify(normalized));

    return JSON.stringify(normalized);
};
