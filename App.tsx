import "./src/lib/configureAmplify";

import { Authenticator } from "@aws-amplify/ui-react-native";

import RootNavigator from "./src/navigation/RootNavigator";

export default function App() {
    return (
        <Authenticator.Provider>
            <Authenticator>
                <RootNavigator />
            </Authenticator>
        </Authenticator.Provider>
    );
}
