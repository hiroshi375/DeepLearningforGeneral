import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import ExamListScreen from "../screens/ExamListScreen";
import ExamStartScreen from "../screens/ExamStartScreen";
import QuizScreen from "../screens/QuizScreen";
import ResultScreen from "../screens/ResultScreen";

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
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Home">
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{
                        title: "G検定問題集",
                    }}
                />

                <Stack.Screen
                    name="ExamList"
                    component={ExamListScreen}
                    options={{
                        title: "問題セット選択",
                    }}
                />

                <Stack.Screen
                    name="ExamStart"
                    component={ExamStartScreen}
                    options={{
                        title: "学習開始",
                    }}
                />

                <Stack.Screen
                    name="Quiz"
                    component={QuizScreen}
                    options={{
                        title: "問題回答",
                    }}
                />

                <Stack.Screen
                    name="Result"
                    component={ResultScreen}
                    options={{
                        title: "結果",
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
