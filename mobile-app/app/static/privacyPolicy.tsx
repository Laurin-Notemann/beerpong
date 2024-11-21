import { Stack } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { navStyles } from '@/app/navigation/navStyles';
import { Heading } from '@/components/Menu/MenuSection';
import { theme } from '@/theme';

function P({ children }: any) {
    return <Text style={{ color: 'white' }}>{children}</Text>;
}

export default function Page() {
    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...navStyles,
                    headerTitle: 'Privacy Policy',
                }}
            />
            <ScrollView
                style={{
                    flex: 1,

                    backgroundColor: theme.color.bg,
                }}
                contentContainerStyle={{
                    paddingHorizontal: 16,

                    paddingBottom: 128,
                }}
            >
                <Heading title="Privacy Policy" />
                <P>
                    Effective Date: Nov 21st 2024{'\n\n'} We respect your
                    privacy and are committed to protecting your personal data.
                    This Privacy Policy explains how our app handles your data
                    in compliance with the General Data Protection Regulation
                    (GDPR).
                </P>
                <Heading title="1. Who Are We?" />
                <P>
                    We are the creators of this app, designed to provide a
                    simple, secure, and private experience. Since we do not
                    collect or store any personal data, you can enjoy our app
                    without worrying about your privacy.
                </P>
                <Heading title="2. What Data Do We Collect?" />
                <P>
                    We do not collect, store, or process any personal data about
                    you. Our app does not have accounts, user profiles, or any
                    features that require you to input personal information.
                </P>
                <Heading title="3. Error Tracking with Sentry" />
                <P>
                    To ensure the app runs smoothly and to fix any technical
                    issues, we use Sentry, a third-party service for error
                    tracking. Here's how it works: What is sent? Sentry collects
                    anonymized error reports about crashes and technical issues,
                    such as device type, operating system version, and app
                    performance data. What is NOT sent? No personal data, such
                    as your name, email, or any identifiers that could link the
                    data to you, is sent to Sentry. Why is this necessary? This
                    data helps us identify and fix issues to improve the app for
                    everyone. You can learn more about Sentry's privacy
                    practices here.
                </P>
                <Heading title="4. Your Rights" />
                <P>
                    Under GDPR, you have the following rights regarding your
                    personal data: Access and correction: Since we don’t collect
                    any personal data, there’s nothing for you to access or
                    correct. Right to erasure: We don’t store any data, so
                    there’s nothing for us to delete. Right to object: You can
                    stop using the app at any time if you disagree with how
                    anonymized data is handled. If you have questions about your
                    rights, feel free to contact us at{' '}
                    <Text style={{ color: theme.color.confirm }}>
                        linus.bolls@gmail.com
                    </Text>
                    .
                </P>
                <Heading title="5. Data Security" />
                <P>
                    We take data security seriously. Since we don’t process or
                    store personal data, your information cannot be exposed to
                    unauthorized access or breaches.
                </P>
                <Heading title="6. Changes to This Policy" />
                <P>
                    We may update this Privacy Policy from time to time. Any
                    changes will be posted in this section, and we recommend
                    checking back occasionally to stay informed.
                </P>
                <Heading title="7. Contact Us" />
                <P>
                    If you have any questions about this Privacy Policy or how
                    the app works, you can contact us at: Email:{' '}
                    <Text style={{ color: theme.color.confirm }}>
                        linus.bolls@gmail.com
                    </Text>
                    .{'\n'}
                    {'\n'}Thank you for using our app! Your privacy is our
                    priority.
                </P>
            </ScrollView>
        </GestureHandlerRootView>
    );
}
