import { RefreshControl as ReactNativeRefreshControl } from 'react-native';

import { RefreshProps } from '@/api/utils/reactQuery';
import { theme } from '@/theme';

export const RefreshControl = (props: RefreshProps) => {
    /**
     * instead of accounting for the vertical offset due to the header here,
     * we might want to instead have `contentInset={{ top: headerHeight }} contentOffset={{ y: -headerHeight }}` on the parent `<FlatList>`,
     * which might be more modular if we ever want to use a `<RefreshControl>` in a list that doesn't have a header
     */
    return (
        <ReactNativeRefreshControl
            {...props}
            tintColor={theme.refreshControl.tintColor}
            progressViewOffset={98}
        />
    );
};
