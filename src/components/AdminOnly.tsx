import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import AppButton from "./AppButton";
import { useIsAdmin } from "../hooks/useIsAdmin";

type Props = {
    children: ReactNode;
    onBack?: () => void;
};

export default function AdminOnly({ children, onBack }: Props) {
    const { isAdmin, checkingAdmin } = useIsAdmin();

    if (checkingAdmin) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.text}>権限を確認中...</Text>
            </View>
        );
    }

    if (!isAdmin) {
        return (
            <View style={styles.center}>
                <Text style={styles.title}>管理者権限がありません</Text>
                <Text style={styles.text}>
                    この画面は管理者のみ利用できます。
                </Text>

                {!!onBack && (
                    <AppButton mode="outlined" onPress={onBack}>
                        戻る
                    </AppButton>
                )}
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        gap: 12,
        backgroundColor: "#ffffff",
    },
    title: {
        fontSize: 20,
        fontWeight: "800",
        color: "#1f2937",
    },
    text: {
        fontSize: 14,
        color: "#4b5563",
        lineHeight: 22,
        textAlign: "center",
    },
});
