import { RefreshControl as ReactNativeRefreshControl } from 'react-native-gesture-handler';

import { RefreshProps } from '@/api/utils/reactQuery';
import { theme } from '@/theme';

export const RefreshControl = (props: RefreshProps) => {
    return (
        <ReactNativeRefreshControl
            {...props}
            tintColor={theme.refreshControl.tintColor}
        />
    );
};
