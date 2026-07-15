import { useCallback, useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../components/AppButton";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { signOut } from "aws-amplify/auth";
import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { client } from "../lib/client";
import { getUrl } from "aws-amplify/storage";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;
type UserProfileItem = {
    id: string;
    userId?: string | null;
    email?: string | null;
    displayName?: string | null;
    imageIconPath?: string | null;
    role?: string | null;
};

export default function HomeScreen({ navigation }: Props) {
    const { isAdmin, checkingAdmin } = useIsAdmin();
    const [loginUserName, setLoginUserName] = useState("ユーザー");
    const [loginUserIconUrl, setLoginUserIconUrl] = useState<string | null>(
        null,
    );

    const handleSignOut = () => {
        Alert.alert("サインアウト", "サインアウトしますか？", [
            {
                text: "キャンセル",
                style: "cancel",
            },
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

    const loadLoginUser = useCallback(async () => {
        try {
            const currentUser = await getCurrentUser();
            const attributes = await fetchUserAttributes();

            const profileResult = await client.models.UserProfile.list({
                filter: {
                    userId: {
                        eq: currentUser.userId,
                    },
                },
            });

            const profile = profileResult.data?.[0] as
                UserProfileItem | undefined;

            const displayName =
                profile?.displayName?.trim() ||
                attributes.name?.trim() ||
                attributes.preferred_username?.trim() ||
                attributes.email?.trim() ||
                currentUser.signInDetails?.loginId ||
                "ユーザー";

            setLoginUserName(displayName);

            if (profile?.imageIconPath) {
                const urlResult = await getUrl({
                    path: profile.imageIconPath,
                });
                setLoginUserIconUrl(urlResult.url.toString());
            } else {
                setLoginUserIconUrl(null);
            }
        } catch (error) {
            console.error("Load login user error:", error);
            setLoginUserName("ユーザー");
            setLoginUserIconUrl(null);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", () => {
            void loadLoginUser();
        });

        return unsubscribe;
    }, [navigation, loadLoginUser]);

    useEffect(() => {
        const unsubscribe = navigation.addListener("focus", () => {
            void loadLoginUser();
        });

        return unsubscribe;
    }, [navigation, loadLoginUser]);

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.headerArea}>
                <Image
                    source={require("../../assets/g-exam-icon.png")}
                    style={styles.appIcon}
                    resizeMode="contain"
                />
                <Text style={styles.appTitle}>G検定 問題集アプリ</Text>

                <View style={styles.loginUserRow}>
                    {loginUserIconUrl ? (
                        <Image
                            source={{ uri: loginUserIconUrl }}
                            style={styles.loginUserIcon}
                        />
                    ) : (
                        <View style={styles.loginUserIconPlaceholder}>
                            <Text style={styles.loginUserIconPlaceholderText}>
                                {loginUserName.slice(0, 1)}
                            </Text>
                        </View>
                    )}

                    <Text style={styles.loginUserName}>{loginUserName}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardText}>
                    模擬試験・章別問題から選んでG検定対策を進めます。
                </Text>

                <AppButton onPress={() => navigation.navigate("ExamList")}>
                    問題セットを選ぶ
                </AppButton>

                <AppButton onPress={() => navigation.navigate("QuizHistory")}>
                    学習履歴
                </AppButton>

                <AppButton onPress={() => navigation.navigate("Review")}>
                    復習
                </AppButton>

                <AppButton onPress={() => navigation.navigate("StudyStats")}>
                    学習統計
                </AppButton>

                <AppButton onPress={() => navigation.navigate("Profile")}>
                    プロフィール
                </AppButton>

                {!checkingAdmin && isAdmin && (
                    <>
                        <AppButton
                            variant="admin"
                            onPress={() => navigation.navigate("AdminExamList")}
                        >
                            問題セット管理
                        </AppButton>

                        <AppButton
                            variant="admin"
                            onPress={() =>
                                navigation.navigate("AdminQuestionList")
                            }
                        >
                            問題管理
                        </AppButton>

                        <AppButton
                            variant="admin"
                            onPress={() =>
                                navigation.navigate("AdminQuestionImport")
                            }
                        >
                            問題一括登録
                        </AppButton>
                    </>
                )}

                <AppButton mode="outlined" onPress={handleSignOut}>
                    サインアウト
                </AppButton>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        paddingBottom: 40,
        gap: 20,
        backgroundColor: "#ffffff",
    },
    title: {
        fontSize: 26,
        fontWeight: "800",
        color: "#1f2937",
    },
    subtitle: {
        fontSize: 16,
        color: "#4b5563",
        marginBottom: 8,
    },
    card: {
        padding: 18,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#d8dce8",
        backgroundColor: "#f8fafc",
        gap: 12,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1f2937",
    },
    cardText: {
        fontSize: 14,
        lineHeight: 22,
        color: "#4b5563",
    },
    headerArea: {
        alignItems: "center",
        marginBottom: 24,
    },

    appIcon: {
        width: 180,
        height: 180,
        marginBottom: 12,
    },

    appTitle: {
        fontSize: 26,
        lineHeight: 34,
        fontWeight: "700",
        color: "#2f3349",
        textAlign: "center",
        marginBottom: 18,
    },

    loginUserRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: 4,
        marginBottom: 8,
    },

    loginUserIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#eef2f7",
    },

    loginUserIconPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#dbeafe",
    },

    loginUserIconPlaceholderText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#2563eb",
    },

    loginUserName: {
        fontSize: 17,
        lineHeight: 24,
        fontWeight: "700",
        color: "#2f3349",
    },
});
