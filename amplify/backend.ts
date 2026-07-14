import { defineBackend } from "@aws-amplify/backend";
import { Stack } from "aws-cdk-lib";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import {
    BEDROCK_MODEL_ID,
    extractQuestionFromImages,
} from "./functions/extractQuestionFromImages/resource";

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
    auth,
    data,
    storage,
    extractQuestionFromImages,
});

const extractQuestionFromImagesLambda =
    backend.extractQuestionFromImages.resources.lambda;

const stack = Stack.of(extractQuestionFromImagesLambda);

const foundationModelId = BEDROCK_MODEL_ID.replace(/^jp\./, "");

extractQuestionFromImagesLambda.addToRolePolicy(
    new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: [
            // 呼び出し元の inference profile
            `arn:aws:bedrock:${stack.region}:${stack.account}:inference-profile/${BEDROCK_MODEL_ID}`,

            // Bedrock が内部的に呼ぶ foundation model
            // 今回のエラーで ap-northeast-3 が出ているため必須
            `arn:aws:bedrock:ap-northeast-3::foundation-model/${foundationModelId}`,

            // 将来、別の日本リージョンへルーティングされた場合に備える
            `arn:aws:bedrock:ap-northeast-1::foundation-model/${foundationModelId}`,
            `arn:aws:bedrock:ap-northeast-2::foundation-model/${foundationModelId}`,

            // application inference profile を使う場合の保険
            `arn:aws:bedrock:${stack.region}:${stack.account}:application-inference-profile/*`,
        ],
    }),
);
