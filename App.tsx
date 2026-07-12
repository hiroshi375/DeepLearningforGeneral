import "./src/lib/configureAmplify";

import { Authenticator } from "@aws-amplify/ui-react-native";
import { StatusBar } from "expo-status-bar";

import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
    return (
        <Authenticator.Provider>
            <StatusBar style="dark" hidden={false} />

            <Authenticator>
                <RootNavigator />
            </Authenticator>
        </Authenticator.Provider>
    );
}
