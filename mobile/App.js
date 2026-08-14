import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-native-stack-stack-navigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import ChatScreen from './screens/ChatScreen';
import AdminScreen from './screens/AdminScreen';

const Stack = createNativeStackNavigator();

export default function App() {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkToken = async () => {
            const stored = await AsyncStorage.getItem('token');
            const admin = await AsyncStorage.getItem('isAdmin');
            setToken(stored);
            setIsAdmin(admin === 'true');
            setLoading(false);
        };
        checkToken();
    }, []);

    if (loading) return null;

    return (
        <NavigationContainer>
            <Stack.Navigator>
                {!token ? (
                    <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                ) : (
                    <>
                        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'GuardAI' }} />
                        {isAdmin && <Stack.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin Panel' }} />}
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
