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
    variant?: "default" | "admin";
    disabled?: boolean;
};

export default function AppButton({
    children,
    onPress,
    mode = "contained",
    variant = "default",
    disabled = false,
}: Props) {
    return (
        <Pressable
            disabled={disabled}
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                variant === "admin" && styles.adminButton,
                mode === "outlined" && styles.outlined,
                variant === "admin" &&
                    mode === "outlined" &&
                    styles.adminOutlined,
                disabled && styles.disabled,
                pressed && !disabled && styles.pressed,
            ]}
        >
            <Text
                style={[
                    styles.text,
                    mode === "outlined" && styles.outlinedText,
                    variant === "admin" &&
                        mode === "outlined" &&
                        styles.adminOutlinedText,
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
    adminButton: {
        backgroundColor: "#1f3a5f",
        borderColor: "#1f3a5f",
    },
    adminOutlined: {
        backgroundColor: "#ffffff",
        borderColor: "#1f3a5f",
    },
    adminOutlinedText: {
        color: "#1f3a5f",
    },
});
