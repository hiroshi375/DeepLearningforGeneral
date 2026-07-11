import { useCallback, useEffect, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";

export function useIsAdmin() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [checkingAdmin, setCheckingAdmin] = useState(true);

    const checkAdmin = useCallback(async () => {
        setCheckingAdmin(true);

        try {
            const session = await fetchAuthSession();

            const groupsValue =
                session.tokens?.accessToken.payload["cognito:groups"];

            const groups = Array.isArray(groupsValue)
                ? groupsValue
                : typeof groupsValue === "string"
                  ? [groupsValue]
                  : [];

            setIsAdmin(groups.includes("Admins"));
        } catch (error) {
            console.error("Check admin error:", error);
            setIsAdmin(false);
        } finally {
            setCheckingAdmin(false);
        }
    }, []);

    useEffect(() => {
        void checkAdmin();
    }, [checkAdmin]);

    return {
        isAdmin,
        checkingAdmin,
        reloadAdmin: checkAdmin,
    };
}
