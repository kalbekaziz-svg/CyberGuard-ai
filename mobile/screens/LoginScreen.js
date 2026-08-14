import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [isRegister, setIsRegister] = useState(false);

    const login = async () => {
        try {
            const res = await API.post('/auth/login', { email, password });
            await AsyncStorage.setItem('token', res.data.token);
            navigation.navigate('Chat');
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Login failed');
        }
    };

    const register = async () => {
        try {
            const res = await API.post('/auth/register', { email, username, password, passwordConfirm: password });
            await AsyncStorage.setItem('token', res.data.token);
            navigation.navigate('Chat');
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>🛡️ GuardAI</Text>
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
            {isRegister && <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />}
            <TouchableOpacity style={styles.button} onPress={isRegister ? register : login}>
                <Text style={styles.buttonText}>{isRegister ? 'Register' : 'Login'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
                <Text style={styles.toggle}>{isRegister ? 'Back to Login' : 'No account? Register'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#0a0e27' },
    title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#fff' },
    input: { borderWidth: 1, borderColor: '#0096ff', padding: 15, marginBottom: 15, borderRadius: 5, backgroundColor: '#1a1f3a', color: '#fff' },
    button: { backgroundColor: '#0096ff', padding: 15, borderRadius: 5, marginBottom: 15 },
    buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
    toggle: { color: '#0096ff', textAlign: 'center', textDecorationLine: 'underline' }
});
