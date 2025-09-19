import { Stack } from 'expo-router';
import React, { useState } from 'react';

import { useNavigation } from '@/app/navigation/useNavigation';
import { DualCameraView } from '@/components/DualCameraView';
import { HeaderItem } from '@/components/HeaderItem';
import InputModal from '@/components/InputModal';
import { useMatchDraftStore } from '@/zustand/matchDraftStore';

export default function Page() {
    const nav = useNavigation();

    const [result, setResult] = useState<{
        blueTeamPhotoUri: string;
        redTeamPhotoUri: string;
    } | null>(null);

    const matchDraft = useMatchDraftStore();

    const [isSaving, setIsSaving] = useState(false);

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: '✨ Photo Time! ✨',
                    headerLeft: () => (
                        <HeaderItem onPress={() => nav.goBack()}>
                            Cancel
                        </HeaderItem>
                    ),
                    headerRight:
                        result == null
                            ? undefined
                            : () => (
                                  <HeaderItem
                                      noMargin
                                      onPress={() => {
                                          if (!result) return;

                                          setIsSaving(true);

                                          matchDraft.actions.setTeamPhotos(
                                              result
                                          );
                                          nav.goBack();
                                      }}
                                      isLoading={isSaving}
                                  >
                                      Save
                                  </HeaderItem>
                              ),
                }}
            />
            <InputModal>
                <DualCameraView onResult={setResult} />
            </InputModal>
        </>
    );
}
