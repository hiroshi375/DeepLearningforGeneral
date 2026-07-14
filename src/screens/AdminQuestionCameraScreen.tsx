import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/RootNavigator";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import ImageCropPicker from "react-native-image-crop-picker";

type Props = NativeStackScreenProps<RootStackParamList, "AdminQuestionCamera">;

export default function AdminQuestionCameraScreen({
    route,
    navigation,
}: Props) {
    const { imageType } = route.params;

    const cameraRef = useRef<any>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [capturedUri, setCapturedUri] = useState<string | null>(null);
    const [takingPicture, setTakingPicture] = useState(false);

    const title =
        imageType === "question" ? "問題画像を撮影" : "解説画像を撮影";

    const takePicture = async () => {
        if (!cameraRef.current || takingPicture) {
            return;
        }

        try {
            setTakingPicture(true);

            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.9,
                skipProcessing: false,
            });

            if (!photo?.uri) {
                Alert.alert("エラー", "画像を撮影できませんでした。");
                return;
            }

            setCapturedUri(photo.uri);
        } catch (error) {
            console.error("Take picture error:", error);
            Alert.alert("エラー", "撮影に失敗しました。");
        } finally {
            setTakingPicture(false);
        }
    };

    const rotatePhoto = async (degrees: 90 | -90) => {
        if (!capturedUri) {
            return;
        }

        try {
            const result = await manipulateAsync(
                capturedUri,
                [
                    {
                        rotate: degrees,
                    },
                ],
                {
                    compress: 0.9,
                    format: SaveFormat.JPEG,
                },
            );

            setCapturedUri(result.uri);
        } catch (error) {
            console.error("Rotate photo error:", error);
            Alert.alert("エラー", "画像の回転に失敗しました。");
        }
    };

    const usePhoto = () => {
        if (!capturedUri) {
            return;
        }

        navigation.navigate({
            name: "AdminQuestionImport",
            params: {
                capturedImageType: imageType,
                capturedImageUri: capturedUri,
            },
            merge: true,
        });
    };

    const editPhoto = async () => {
        if (!capturedUri) {
            return;
        }

        try {
            const editedImage = await ImageCropPicker.openCropper({
                path: capturedUri,
                mediaType: "photo",
                cropping: true,
                freeStyleCropEnabled: true,
                cropperToolbarTitle: "画像を切り取り",
                cropperChooseText: "使用する",
                cropperCancelText: "キャンセル",
                compressImageQuality: 0.9,
                includeExif: false,
            });

            if (!editedImage?.path) {
                return;
            }

            setCapturedUri(editedImage.path);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);

            if (
                message.includes("cancel") ||
                message.includes("cancelled") ||
                message.includes("User cancelled")
            ) {
                return;
            }

            console.error("Edit photo error:", error);
            Alert.alert("エラー", "画像の切り取り・編集に失敗しました。");
        }
    };

    if (!permission) {
        return (
            <View style={styles.center}>
                <ActivityIndicator />
                <Text>カメラ権限を確認しています...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text style={styles.permissionText}>
                    カメラを使用するには権限が必要です。
                </Text>

                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={requestPermission}
                >
                    <Text style={styles.primaryButtonText}>
                        カメラ権限を許可
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.secondaryButtonText}>戻る</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
            </View>

            {capturedUri ? (
                <View style={styles.previewArea}>
                    <Image
                        source={{ uri: capturedUri }}
                        style={styles.previewImage}
                        resizeMode="contain"
                    />

                    <View style={styles.previewActions}>
                        <View style={styles.editRow}>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={editPhoto}
                            >
                                <Text style={styles.editButtonText}>
                                    切り取り・編集
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={() => setCapturedUri(null)}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    撮り直す
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={usePhoto}
                            >
                                <Text style={styles.primaryButtonText}>
                                    この画像を使う
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ) : (
                <View style={styles.cameraArea}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing="back"
                    />

                    <View style={styles.guideBox}>
                        <Text style={styles.guideText}>
                            問題全体が枠内に入るように撮影してください
                        </Text>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.secondaryButtonText}>
                                キャンセル
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.captureButton,
                                takingPicture && styles.disabledButton,
                            ]}
                            onPress={takePicture}
                            disabled={takingPicture}
                        >
                            <Text style={styles.captureButtonText}>
                                {takingPicture ? "撮影中..." : "撮影"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#000000",
    },

    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        backgroundColor: "#111827",
    },

    title: {
        fontSize: 20,
        fontWeight: "800",
        color: "#ffffff",
    },

    center: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        backgroundColor: "#ffffff",
    },

    permissionText: {
        fontSize: 16,
        lineHeight: 24,
        color: "#374151",
        textAlign: "center",
    },

    cameraArea: {
        flex: 1,
    },

    camera: {
        flex: 1,
    },

    guideBox: {
        position: "absolute",
        left: 24,
        right: 24,
        top: 100,
        bottom: 130,
        borderWidth: 2,
        borderColor: "#ffffff",
        borderRadius: 12,
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 12,
    },

    guideText: {
        color: "#ffffff",
        fontSize: 13,
        fontWeight: "700",
        backgroundColor: "rgba(0,0,0,0.45)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        overflow: "hidden",
    },

    previewArea: {
        flex: 1,
        padding: 12,
    },

    previewImage: {
        flex: 1,
        width: "100%",
        backgroundColor: "#000000",
    },

    actionRow: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 52,
        backgroundColor: "#111827",
    },

    primaryButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        paddingVertical: 14,
        backgroundColor: "#2563eb",
    },

    primaryButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "800",
    },

    secondaryButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        paddingVertical: 14,
        backgroundColor: "#374151",
    },

    secondaryButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "800",
    },

    captureButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        paddingVertical: 14,
        backgroundColor: "#16a34a",
    },

    captureButtonText: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "800",
    },

    disabledButton: {
        opacity: 0.6,
    },
    previewActions: {
        backgroundColor: "#111827",
        paddingBottom: 24,
    },

    rotationRow: {
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 12,
    },

    editButtonText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "800",
    },

    editRow: {
        paddingHorizontal: 16,
        paddingTop: 12,
    },

    editButton: {
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        paddingVertical: 12,
        backgroundColor: "#4b5563",
    },
});
