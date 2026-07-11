import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { fetchUserAttributes, getCurrentUser, signOut } from "aws-amplify/auth";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../components/AppButton";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Profile">;

type ProfileInfo = {
    userId: string;
    username: string;
    email?: string;
    name?: string;
};

export default function ProfileScreen({ navigation }: Props) {
    const [profile, setProfile] = useState<ProfileInfo | null>(null);

    const loadProfile = useCallback(async () => {
        try {
            const user = await getCurrentUser();
            const attributes = await fetchUserAttributes();

            setProfile({
                userId: user.userId,
                username: user.username,
                email: attributes.email,
                name: attributes.name,
            });
        } catch (error) {
            console.error("Profile load error:", error);
            Alert.alert("エラー", "プロフィールの取得に失敗しました。");
        }
    }, []);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    const handleSignOut = async () => {
        Alert.alert("サインアウト", "サインアウトしますか？", [
            { text: "キャンセル", style: "cancel" },
            {
                text: "サインアウト",
                style: "destructive",
                onPress: async () => {
                    try {
                        await signOut();
                    } catch (error) {
                        console.error("Sign out error:", error);
                        Alert.alert("エラー", "サインアウトに失敗しました。");
                    }
                },
            },
        ]);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>プロフィール</Text>

            <View style={styles.card}>
                <Text style={styles.label}>ユーザー名</Text>
                <Text style={styles.value}>{profile?.username ?? "-"}</Text>

                <Text style={styles.label}>メールアドレス</Text>
                <Text style={styles.value}>{profile?.email ?? "-"}</Text>

                <Text style={styles.label}>ユーザーID</Text>
                <Text style={styles.value}>{profile?.userId ?? "-"}</Text>
            </View>

            <AppButton onPress={() => navigation.navigate("StudyStats")}>
                学習統計を見る
            </AppButton>

            <AppButton onPress={() => navigation.navigate("QuizHistory")}>
                学習履歴を見る
            </AppButton>

            <AppButton mode="outlined" onPress={handleSignOut}>
                サインアウト
            </AppButton>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        gap: 16,
        backgroundColor: "#ffffff",
    },
    title: {
        fontSize: 24,
        fontWeight: "800",
        color: "#1f2937",
    },
    card: {
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 12,
        padding: 16,
        gap: 8,
        backgroundColor: "#f8fafc",
    },
    label: {
        fontSize: 13,
        fontWeight: "700",
        color: "#6b7280",
        marginTop: 8,
    },
    value: {
        fontSize: 15,
        color: "#1f2937",
        fontWeight: "700",
    },
});
