import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import ExamListScreen from "../screens/ExamListScreen";
import ExamStartScreen from "../screens/ExamStartScreen";
import QuizScreen from "../screens/QuizScreen";
import ResultScreen from "../screens/ResultScreen";

import AdminQuestionCreateScreen from "../screens/AdminQuestionCreateScreen";
import AdminQuestionListScreen from "../screens/AdminQuestionListScreen";
import AdminQuestionEditScreen from "../screens/AdminQuestionEditScreen";
import AdminQuestionImportScreen from "../screens/AdminQuestionImportScreen";
import AdminExamCreateScreen from "../screens/AdminExamCreateScreen";
import AdminExamListScreen from "../screens/AdminExamListScreen";
import AdminExamEditScreen from "../screens/AdminExamEditScreen";

import QuizHistoryScreen from "../screens/QuizHistoryScreen";
import ResultDetailScreen from "../screens/ResultDetailScreen";
import ReviewScreen from "../screens/ReviewScreen";
import StudyStatsScreen from "../screens/StudyStatsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AdminQuestionCameraScreen from "../screens/AdminQuestionCameraScreen";

export type RootStackParamList = {
    Home: undefined;
    ExamList: undefined;
    ExamStart: {
        examId: string;
    };
    Quiz: {
        examId: string;
        mode?: "PRACTICE" | "EXAM";
    };
    Result: {
        sessionId: string;
    };

    AdminQuestionCreate: undefined;
    AdminQuestionList: undefined;
    AdminQuestionEdit: {
        questionId: string;
    };
    AdminQuestionImport:
        | {
              capturedImageType?: "question" | "explanation";
              capturedImageUri?: string;
          }
        | undefined;
    AdminQuestionCamera: {
        imageType: "question" | "explanation";
    };
    AdminExamCreate: undefined;
    AdminExamList: undefined;
    AdminExamEdit: {
        examId: string;
    };

    QuizHistory: undefined;
    ResultDetail: {
        sessionId: string;
    };
    Review: undefined;
    StudyStats: undefined;
    Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Home">
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ title: "G検定問題集" }}
                />

                <Stack.Screen
                    name="ExamList"
                    component={ExamListScreen}
                    options={{ title: "問題セット選択" }}
                />

                <Stack.Screen
                    name="ExamStart"
                    component={ExamStartScreen}
                    options={{ title: "学習開始" }}
                />

                <Stack.Screen
                    name="Quiz"
                    component={QuizScreen}
                    options={{ title: "問題回答" }}
                />

                <Stack.Screen
                    name="Result"
                    component={ResultScreen}
                    options={{ title: "結果" }}
                />

                <Stack.Screen
                    name="AdminQuestionCreate"
                    component={AdminQuestionCreateScreen}
                    options={{ title: "問題登録" }}
                />

                <Stack.Screen
                    name="AdminQuestionList"
                    component={AdminQuestionListScreen}
                    options={{ title: "問題一覧" }}
                />

                <Stack.Screen
                    name="AdminQuestionEdit"
                    component={AdminQuestionEditScreen}
                    options={{ title: "問題編集" }}
                />

                <Stack.Screen
                    name="AdminQuestionImport"
                    component={AdminQuestionImportScreen}
                    options={{ title: "問題一括登録" }}
                />

                <Stack.Screen
                    name="AdminExamCreate"
                    component={AdminExamCreateScreen}
                    options={{ title: "問題セット登録" }}
                />

                <Stack.Screen
                    name="AdminExamList"
                    component={AdminExamListScreen}
                    options={{ title: "問題セット一覧" }}
                />

                <Stack.Screen
                    name="AdminExamEdit"
                    component={AdminExamEditScreen}
                    options={{ title: "問題セット編集" }}
                />

                <Stack.Screen
                    name="QuizHistory"
                    component={QuizHistoryScreen}
                    options={{ title: "学習履歴" }}
                />

                <Stack.Screen
                    name="ResultDetail"
                    component={ResultDetailScreen}
                    options={{ title: "結果詳細" }}
                />

                <Stack.Screen
                    name="Review"
                    component={ReviewScreen}
                    options={{ title: "復習" }}
                />

                <Stack.Screen
                    name="StudyStats"
                    component={StudyStatsScreen}
                    options={{ title: "学習統計" }}
                />

                <Stack.Screen
                    name="Profile"
                    component={ProfileScreen}
                    options={{ title: "プロフィール" }}
                />

                <Stack.Screen
                    name="AdminQuestionCamera"
                    component={AdminQuestionCameraScreen}
                    options={{
                        title: "画像を撮影",
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
