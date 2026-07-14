import { defineStorage } from "@aws-amplify/backend";
import { extractQuestionFromImages } from "../functions/extractQuestionFromImages/resource";

export const storage = defineStorage({
    name: "deepLearningForGeneralStorage",
    access: (allow) => ({
        "profile-icons/*": [
            allow.authenticated.to(["read", "write", "delete"]),
            allow.groups(["Admins"]).to(["read", "write", "delete"]),
        ],
        "question-import-images/*": [
            allow.groups(["Admins"]).to(["read", "write", "delete"]),
            // LambdaからS3上の問題画像・解説画像を読むために必要
            allow.resource(extractQuestionFromImages).to(["read"]),
        ],
    }),
});
