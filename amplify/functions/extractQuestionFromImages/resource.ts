import { defineFunction } from "@aws-amplify/backend";

export const BEDROCK_MODEL_ID = "jp.anthropic.claude-haiku-4-5-20251001-v1:0";

export const extractQuestionFromImages = defineFunction({
    name: "extractQuestionFromImages",
    entry: "./handler.ts",
    timeoutSeconds: 60,
    memoryMB: 1024,
    environment: {
        BEDROCK_MODEL_ID,
    },
});
