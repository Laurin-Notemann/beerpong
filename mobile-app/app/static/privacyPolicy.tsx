import { Stack } from 'expo-router';
import { ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/app/Background';
import { useNavStyles } from '@/app/navigation/navStyles';
import { Heading } from '@/components/Menu/MenuSection';
import Text from '@/components/Text';

export default function Page() {
    return (
        <GestureHandlerRootView>
            <Stack.Screen
                options={{
                    ...useNavStyles(),
                    headerTitle: 'Privacy Policy',
                }}
            />
            <AppBackground />
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingHorizontal: 16,

                    paddingBottom: 32,
                }}
            >
                <SafeAreaView>
                    <Heading paragraph title="Privacy Policy" border={false} />
                    <Text paragraph>
                        Effective Date: Nov 21st 2024{'\n\n'} We respect your
                        privacy and are committed to protecting your personal
                        data. This Privacy Policy explains how our app handles
                        your data in compliance with the General Data Protection
                        Regulation (GDPR).
                    </Text>
                    <Heading paragraph title="1. Who Are We?" />
                    <Text paragraph>
                        We are the creators of this app, designed to provide a
                        simple, secure, and private experience. Since we do not
                        collect or store any personal data, you can enjoy our
                        app without worrying about your privacy.
                    </Text>
                    <Heading paragraph title="2. What Data Do We Collect?" />
                    <Text paragraph>
                        We do not collect, store, or process any personal data
                        about you. Our app does not have accounts, user
                        profiles, or any features that require you to input
                        personal information.
                    </Text>
                    <Heading paragraph title="3. Error Tracking with Sentry" />
                    <Text paragraph>
                        To ensure the app runs smoothly and to fix any technical
                        issues, we use Sentry, a third-party service for error
                        tracking. Here's how it works: What is sent? Sentry
                        collects anonymized error reports about crashes and
                        technical issues, such as device type, operating system
                        version, and app performance data. What is NOT sent? No
                        personal data, such as your name, email, or any
                        identifiers that could link the data to you, is sent to
                        Sentry. Why is this necessary? This data helps us
                        identify and fix issues to improve the app for everyone.
                        You can learn more about Sentry's privacy practices
                        here.
                    </Text>
                    <Heading paragraph title="4. Your Rights" />
                    <Text paragraph>
                        Under GDPR, you have the following rights regarding your
                        personal data: Access and correction: Since we don’t
                        collect any personal data, there’s nothing for you to
                        access or correct. Right to erasure: We don’t store any
                        data, so there’s nothing for us to delete. Right to
                        object: You can stop using the app at any time if you
                        disagree with how anonymized data is handled. If you
                        have questions about your rights, feel free to contact
                        us at <Text code>linus.bolls@gmail.com</Text>.
                    </Text>
                    <Heading paragraph title="5. Data Security" />
                    <Text paragraph>
                        We take data security seriously. Since we don’t process
                        or store personal data, your information cannot be
                        exposed to unauthorized access or breaches.
                    </Text>
                    <Heading paragraph title="6. Changes to This Policy" />
                    <Text paragraph>
                        We may update this Privacy Policy from time to time. Any
                        changes will be posted in this section, and we recommend
                        checking back occasionally to stay informed.
                    </Text>
                    <Heading paragraph title="7. Contact Us" />
                    <Text paragraph>
                        If you have any questions about this Privacy Policy or
                        how the app works, you can contact us at: Email:{' '}
                        <Text code>linus.bolls@gmail.com</Text>.{'\n'}
                        {'\n'}Thank you for using our app! Your privacy is our
                        priority.
                    </Text>
                </SafeAreaView>
            </ScrollView>
        </GestureHandlerRootView>
    );
}
