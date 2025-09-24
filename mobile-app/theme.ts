import { useLocalSettings } from '@/zustand/localSettingsStore';

const black = '#000';

export interface Theme {
    activeGroupItem: string;
    id: string;
    button: {
        primary: string;
        primaryActive: string;
    };
    overlay: {
        backgroundColor: string | undefined;
        highlightColor: string;
    };
    blur: {
        intensity: number;
        tint: 'dark' | 'light';
    };
    barStyle: 'dark-content' | 'light-content';
    refreshControl: {
        tintColor: string;
    };
    keyboardAppearance: 'light' | 'dark';
    carousel: {
        peekGap: number;
        peekSize: number;
    };
    avatar: {
        bg: string;
        text: string;
        badge: {
            bg: string;
            text: string;
        };
    };
    color: {
        positive: string;
        negative: string;
        premium: string;
        modal: {
            bg: string;
            buttonUnderlay: string;
        };
        text: {
            primary: string;
            secondary: string;
            tertiary: string;
            positive: string;
            negative: string;
            branding: string;
            link: string;
            emphasis: string;
        };
        bg: string;
        topNav: string;
        bottomNav: string;
        team: {
            red: string;
            blue: string;
        };
        delete: string;
        confirm: string;
    };
    borderRadius: {
        card: number;
    };
    tabBarInactiveTintColor: string;
    panel: {
        light: {
            bg: string;
            border: string;
            active: string;
            dividers: string;
        };
        dark: {
            bg: string;
            active: string;
            dividers: string;
        };
    };
    icon: {
        primary: string;
        secondary: string;
    };
    bg: {
        url?: any; // image or undefined
    };
}

const lightModeTheme: Theme = {
    activeGroupItem: 'rgba(0,0,0,0.2)',
    button: {
        primary: '#2C6BED',
        primaryActive: '#2C58B3',
    },
    id: 'light',
    overlay: {
        backgroundColor: 'rgba(255,255,255, 0.5)',
        highlightColor: 'rgba(0, 0, 0, 0.05)',
    },
    blur: {
        intensity: 0,
        tint: 'light',
    },
    barStyle: 'dark-content',
    refreshControl: {
        tintColor: '#666', // lighter tint
    },
    keyboardAppearance: 'light',
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
            buttonUnderlay: '#EAEAEA',
        },
        text: {
            primary: '#1A1A1A', // dark primary
            secondary: '#4F4F4F',
            tertiary: '#7D7D7D',

            positive: '#1BC097',
            negative: '#EE4A58',

            branding: '#2C6BED',

            link: '#6291F3',
            emphasis: '#EF4679',
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
            bg: '#FFFFFF',
            active: '#F5F5F5',
            dividers: '#E0E0E0',
        },
    },
    icon: {
        primary: '#444444',
        secondary: '#999999',
    },
    bg: {
        url: undefined,
    },
};

const darkModeTheme: Theme = {
    activeGroupItem: 'rgba(0,0,0,0.3)',
    button: {
        primary: '#2C6BED',
        primaryActive: '#2C58B3',
    },
    id: 'dark',
    overlay: {
        backgroundColor: undefined,
        highlightColor: 'rgba(255,255,255,0.1)',
    },
    blur: {
        intensity: 0,
        tint: 'dark',
    },
    barStyle: 'light-content',
    refreshControl: {
        tintColor: '#999',
    },
    keyboardAppearance: 'dark',
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
            buttonUnderlay: '#4A4A4A',
        },
        text: {
            primary: '#f6f6f6',
            secondary: '#B3B3B3',
            tertiary: '#8F8F92',

            positive: '#1BC097',
            negative: '#EE4A58',

            branding: '#2C6BED',

            link: '#6291F3',
            emphasis: '#EF4679',
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
    bg: {
        url: undefined,
    },
};

const darkWithGloss: Theme = {
    activeGroupItem: 'rgba(255,255,255,0.08)',
    button: {
        primary: '#AD1F40',
        primaryActive: '#EF4679',
    },
    id: 'darkWithGloss',
    overlay: {
        backgroundColor: undefined,
        highlightColor: 'rgba(255,255,255,0.1)',
    },
    blur: {
        intensity: 50,
        tint: 'dark',
    },
    barStyle: 'light-content',
    refreshControl: {
        tintColor: '#999',
    },
    keyboardAppearance: 'dark',
    carousel: {
        /* the gap to the previous and next cards */
        peekGap: 8,
        /* how much of the previous and next cards is visible */
        peekSize: 8,
    },
    avatar: {
        bg: 'rgba(255,255,255,0.2)',
        text: '#bbb',

        badge: {
            bg: 'white',
            text: '#111',
        },
    },
    color: {
        positive: '#1BC097',
        negative: '#EE4A58',
        premium: '#9647FD',

        modal: {
            bg: '#111',
            buttonUnderlay: '#1f1f1f',
        },
        text: {
            primary: '#f6f6f6',
            secondary: '#B3B3B3',
            tertiary: '#8F8F92',

            positive: '#1BC097',
            negative: '#EE4A58',

            branding: '#2C6BED',

            link: '#EF4679',
            emphasis: '#EF4679',
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
            active: 'rgba(255,255,255,0.05)',
            dividers: 'rgba(255,255,255,0.05)',
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
    bg: {
        url: require('./assets/images/background.png'),
    },
};

export const themes = [lightModeTheme, darkModeTheme, darkWithGloss];

export function useTheme(): Theme {
    const settings = useLocalSettings();

    return themes.find((i) => i.id === settings.themeId)!;
}
