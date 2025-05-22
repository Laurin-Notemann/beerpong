const black = '#000';

const lightModeTheme = {
    refreshControl: {
        tintColor: '#666', // lighter tint
    },
    keyboardAppearance: 'light' as const,
    carousel: {
        peekGap: 8,
        peekSize: 8,
    },
    avatar: {
        bg: '#ECECEC', // light background
        text: '#333333', // dark text

        badge: {
            bg: '#EEEEEE',
            text: '#333333',
        },
    },
    color: {
        positive: '#1BC097', // keep accents
        negative: '#EE4A58',
        premium: '#9647FD',

        modal: {
            bg: '#FFFFFF', // white modal
        },
        text: {
            primary: '#1A1A1A', // dark primary
            secondary: '#4F4F4F',
            tertiary: '#7D7D7D',

            positive: '#1BC097',
            negative: '#EE4A58',

            branding: '#2C6BED',
        },
        bg: '#EFEFF0', // white background
        topNav: '#FFFFFF',
        bottomNav: '#F7F7F7', // light bottom nav
        team: {
            red: '#EE4A58',
            blue: '#18A0FB',
        },
        delete: '#F44336',
        confirm: '#6291F3',
    },
    borderRadius: {
        card: 10,
    },
    tabBarInactiveTintColor: '#8E8E8E',
    panel: {
        light: {
            bg: '#FFFFFF',
            border: '#E0E0E0',
            active: '#F5F5F5',
            dividers: '#E0E0E0',
        },
        dark: {
            bg: '#F0F0F0', // slightly darker for “dark” panels in light mode
            active: '#EAEAEA',
            dividers: '#EAEAEA',
        },
    },
    icon: {
        primary: '#444444',
        secondary: '#999999',
    },
};

const darkModeTheme = {
    refreshControl: {
        tintColor: '#999',
    },
    keyboardAppearance: 'dark' as const,
    carousel: {
        /* the gap to the previous and next cards */
        peekGap: 8,
        /* how much of the previous and next cards is visible */
        peekSize: 8,
    },
    avatar: {
        bg: '#D2D2DC',
        text: '#4F4F6D',

        badge: {
            bg: '#D4D4D4',
            text: '#333',
        },
    },
    color: {
        positive: '#1BC097',
        negative: '#EE4A58',
        premium: '#9647FD',

        modal: {
            bg: '#222',
        },
        text: {
            primary: '#f6f6f6',
            secondary: '#B3B3B3',
            tertiary: '#8F8F92',

            positive: '#1BC097',
            negative: '#EE4A58',

            branding: '#2C6BED',
        },
        bg: black,
        topNav: black,
        bottomNav: '#31302F',
        team: {
            red: '#EE4A58',
            blue: '#18A0FB',
        },
        delete: '#F44336',
        confirm: '#6291F3',
    },
    borderRadius: {
        card: 10,
    },
    tabBarInactiveTintColor: '#828181',
    panel: {
        light: {
            bg: '#2e2e2e',
            border: '#444',
            active: '#3B3B3B',
            dividers: '#3B3B3B',
        },
        dark: {
            bg: '#1B1B1B',
            active: '#2F2F2F',
            dividers: '#2F2F2F',
        },
    },
    icon: {
        primary: '#D4D4D4',
        secondary: '#666',
    },
};

export const theme = darkModeTheme;
