import type { ReactNode } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    type GestureResponderEvent,
} from "react-native";

type Props = {
    children: ReactNode;
    onPress: (event: GestureResponderEvent) => void;
    mode?: "contained" | "outlined";
    disabled?: boolean;
};

export default function AppButton({
    children,
    onPress,
    mode = "contained",
    disabled = false,
}: Props) {
    return (
        <Pressable
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                mode === "outlined" && styles.outlined,
                disabled && styles.disabled,
                pressed && !disabled && styles.pressed,
            ]}
        >
            <Text
                style={[
                    styles.text,
                    mode === "outlined" && styles.outlinedText,
                    disabled && styles.disabledText,
                ]}
            >
                {children}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: "#4b6f8f",
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#4b6f8f",
    },
    outlined: {
        backgroundColor: "#ffffff",
    },
    text: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "700",
    },
    outlinedText: {
        color: "#4b6f8f",
    },
    disabled: {
        opacity: 0.5,
    },
    disabledText: {
        color: "#eeeeee",
    },
    pressed: {
        opacity: 0.75,
        transform: [{ translateY: 1 }],
    },
});
