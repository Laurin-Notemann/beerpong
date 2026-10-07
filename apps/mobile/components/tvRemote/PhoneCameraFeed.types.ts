import type { Ref } from 'react';

export interface PhoneCameraFeedHandle {
    stop: () => void;
}

export interface PhoneCameraFeedProps {
    ref: Ref<PhoneCameraFeedHandle>;
    url: string;
    active: boolean;
    onStopped: () => void;
    onFailure: () => void;
}
