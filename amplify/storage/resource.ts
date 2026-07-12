import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
    name: "deepLearningForGeneralStorage",
    access: (allow) => ({
        "profile-icons/*": [
            allow.authenticated.to(["read", "write", "delete"]),
            allow.groups(["Admins"]).to(["read", "write", "delete"]),
        ],
    }),
});
