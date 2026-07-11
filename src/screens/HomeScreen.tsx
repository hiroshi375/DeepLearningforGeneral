import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../components/AppButton";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { signOut } from "aws-amplify/auth";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
    const { isAdmin, checkingAdmin } = useIsAdmin();

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

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>DeepLearning for General</Text>
            <Text style={styles.subtitle}>G検定問題集アプリ</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>学習を開始</Text>
                <Text style={styles.cardText}>
                    模擬試験・章別問題から選んで、G検定対策を進めます。
                </Text>

                <AppButton onPress={() => navigation.navigate("ExamList")}>
                    問題セットを選ぶ
                </AppButton>

                {!checkingAdmin && isAdmin && (
                    <View style={styles.adminBox}>
                        <Text style={styles.adminTitle}>管理者メニュー</Text>

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
                    </View>
                )}

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
    adminBox: {
        marginTop: 12,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#d8dce8",
        backgroundColor: "#f8fafc",
        gap: 10,
    },
    adminTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1f2937",
    },
});
