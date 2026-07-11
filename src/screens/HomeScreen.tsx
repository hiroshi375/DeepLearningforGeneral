import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import AppButton from "../components/AppButton";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
    return (
        <View style={styles.container}>
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
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
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
});
