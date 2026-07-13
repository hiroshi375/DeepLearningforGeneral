import { defineFunction } from "@aws-amplify/backend";

export const extractQuestionFromImages = defineFunction({
    name: "extractQuestionFromImages",
    entry: "./handler.ts",
});
