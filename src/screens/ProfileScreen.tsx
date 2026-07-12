import { useCallback, useEffect, useState } from "react";
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { getUrl, uploadData } from "aws-amplify/storage";

import AppButton from "../components/AppButton";
import { client } from "../lib/client";

type UserProfileItem = {
    id: string;
    userId?: string | null;
    email?: string | null;
    displayName?: string | null;
    imageIconPath?: string | null;
    role?: string | null;
};

export default function ProfileScreen() {
    const [profileId, setProfileId] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState("");
    const [imageIconPath, setImageIconPath] = useState<string | null>(null);
    const [imageIconUrl, setImageIconUrl] = useState<string | null>(null);
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(
        null,
    );
    const [saving, setSaving] = useState(false);

    const loadProfile = useCallback(async () => {
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

            if (profile) {
                setProfileId(profile.id);
                setDisplayName(profile.displayName ?? "");
                setImageIconPath(profile.imageIconPath ?? null);

                if (profile.imageIconPath) {
                    const urlResult = await getUrl({
                        path: profile.imageIconPath,
                    });

                    setImageIconUrl(urlResult.url.toString());
                }

                return;
            }

            const initialDisplayName =
                attributes.name?.trim() ||
                attributes.preferred_username?.trim() ||
                attributes.email?.trim() ||
                currentUser.signInDetails?.loginId ||
                "ユーザー";

            const createResult = await client.models.UserProfile.create({
                userId: currentUser.userId,
                email: attributes.email,
                displayName: initialDisplayName,
                role: "USER",
            });

            if (createResult.errors || !createResult.data) {
                console.error(
                    "UserProfile create errors:",
                    createResult.errors,
                );
                Alert.alert("エラー", "プロフィールの作成に失敗しました。");
                return;
            }

            setProfileId(createResult.data.id);
            setDisplayName(createResult.data.displayName ?? initialDisplayName);
        } catch (error) {
            console.error("Load profile error:", error);
            Alert.alert("エラー", "プロフィールの取得に失敗しました。");
        }
    }, []);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    const pickImage = async () => {
        const permissionResult =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert(
                "権限が必要です",
                "画像を選択するには写真ライブラリへのアクセス許可が必要です。",
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled || result.assets.length === 0) {
            return;
        }

        const asset = result.assets[0];

        setSelectedImageUri(asset.uri);
        setImageIconUrl(asset.uri);
    };

    const uploadProfileIcon = async (
        userId: string,
        localUri: string,
    ): Promise<string> => {
        const response = await fetch(localUri);
        const blob = await response.blob();

        const extension = localUri.split(".").pop()?.toLowerCase() || "jpg";

        const normalizedExtension = extension === "png" ? "png" : "jpg";

        const contentType =
            normalizedExtension === "png" ? "image/png" : "image/jpeg";

        const path = `profile-icons/${userId}/icon-${Date.now()}.${normalizedExtension}`;

        await uploadData({
            path,
            data: blob,
            options: {
                contentType,
            },
        }).result;

        return path;
    };

    const saveProfile = async () => {
        const trimmedDisplayName = displayName.trim();

        if (!trimmedDisplayName) {
            Alert.alert("入力エラー", "表示名を入力してください。");
            return;
        }

        try {
            setSaving(true);

            const currentUser = await getCurrentUser();
            const attributes = await fetchUserAttributes();

            let nextImageIconPath = imageIconPath;

            if (selectedImageUri) {
                nextImageIconPath = await uploadProfileIcon(
                    currentUser.userId,
                    selectedImageUri,
                );
            }

            if (profileId) {
                const updateResult = await client.models.UserProfile.update({
                    id: profileId,
                    displayName: trimmedDisplayName,
                    imageIconPath: nextImageIconPath,
                });

                if (updateResult.errors) {
                    console.error(
                        "UserProfile update errors:",
                        updateResult.errors,
                    );
                    Alert.alert("エラー", "プロフィールの更新に失敗しました。");
                    return;
                }
            } else {
                const createResult = await client.models.UserProfile.create({
                    userId: currentUser.userId,
                    email: attributes.email,
                    displayName: trimmedDisplayName,
                    imageIconPath: nextImageIconPath,
                    role: "USER",
                });

                if (createResult.errors || !createResult.data) {
                    console.error(
                        "UserProfile create errors:",
                        createResult.errors,
                    );
                    Alert.alert("エラー", "プロフィールの作成に失敗しました。");
                    return;
                }

                setProfileId(createResult.data.id);
            }

            setImageIconPath(nextImageIconPath ?? null);
            setSelectedImageUri(null);

            if (nextImageIconPath) {
                const urlResult = await getUrl({
                    path: nextImageIconPath,
                });

                setImageIconUrl(urlResult.url.toString());
            }

            Alert.alert("保存しました", "プロフィールを更新しました。");
        } catch (error) {
            console.error("Save profile error:", error);
            Alert.alert("エラー", "プロフィールの保存に失敗しました。");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>プロフィール設定</Text>

            <View style={styles.iconSection}>
                <Pressable onPress={pickImage} style={styles.iconButton}>
                    {imageIconUrl ? (
                        <Image
                            source={{ uri: imageIconUrl }}
                            style={styles.iconImage}
                        />
                    ) : (
                        <View style={styles.iconPlaceholder}>
                            <Text style={styles.iconPlaceholderText}>
                                アイコンを選択
                            </Text>
                        </View>
                    )}
                </Pressable>

                <Text style={styles.iconHelpText}>
                    タップしてイメージアイコンを選択
                </Text>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>表示名</Text>
                <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="表示名を入力"
                    style={styles.input}
                    maxLength={30}
                />
            </View>

            <AppButton onPress={saveProfile} disabled={saving}>
                {saving ? "保存中..." : "保存する"}
            </AppButton>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 48,
        gap: 20,
    },

    title: {
        fontSize: 24,
        fontWeight: "700",
        color: "#2f3349",
        marginBottom: 8,
    },

    iconSection: {
        alignItems: "center",
        gap: 8,
        marginBottom: 8,
    },

    iconButton: {
        width: 120,
        height: 120,
        borderRadius: 60,
        overflow: "hidden",
        backgroundColor: "#eef2f7",
        borderWidth: 1,
        borderColor: "#d8dce8",
    },

    iconImage: {
        width: "100%",
        height: "100%",
    },

    iconPlaceholder: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
    },

    iconPlaceholderText: {
        fontSize: 13,
        color: "#6b7280",
        textAlign: "center",
        fontWeight: "600",
    },

    iconHelpText: {
        fontSize: 13,
        color: "#6b7280",
    },

    formGroup: {
        gap: 8,
    },

    label: {
        fontSize: 14,
        fontWeight: "700",
        color: "#374151",
    },

    input: {
        borderWidth: 1,
        borderColor: "#d8dce8",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        backgroundColor: "#ffffff",
        color: "#111827",
    },
});
