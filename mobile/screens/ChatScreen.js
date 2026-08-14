import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

export default function ChatScreen({ navigation }) {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState('');

    React.useEffect(() => {
        const getToken = async () => {
            const t = await AsyncStorage.getItem('token');
            setToken(t);
        };
        getToken();
    }, []);

    const sendPrompt = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        try {
            const res = await API.post('/ai/text', { prompt, mode: 'general' }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResponse(res.data.response);
            setPrompt('');
        } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Request failed');
        }
        setLoading(false);
    };

    const logout = async () => {
        await AsyncStorage.removeItem('token');
        navigation.navigate('Login');
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.messages}>
                {response ? <Text style={styles.message}>{response}</Text> : <Text style={styles.placeholder}>Ask me something...</Text>}
            </ScrollView>
            <View style={styles.inputArea}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask something..."
                    value={prompt}
                    onChangeText={setPrompt}
                    multiline
                    placeholderTextColor="#666"
                />
                {loading ? (
                    <ActivityIndicator size="large" color="#0096ff" />
                ) : (
                    <TouchableOpacity style={styles.sendButton} onPress={sendPrompt}>
                        <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                )}
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0e27', padding: 10 },
    messages: { flex: 1, marginBottom: 10, backgroundColor: '#1a1f3a', borderRadius: 10, padding: 10 },
    message: { color: '#fff', padding: 10, backgroundColor: '#0096ff', borderRadius: 5, marginBottom: 10 },
    placeholder: { color: '#666', textAlign: 'center', marginTop: 20 },
    inputArea: { marginBottom: 10 },
    input: { backgroundColor: '#1a1f3a', color: '#fff', padding: 12, borderRadius: 5, borderWidth: 1, borderColor: '#0096ff', minHeight: 50, marginBottom: 10 },
    sendButton: { backgroundColor: '#0096ff', padding: 12, borderRadius: 5, alignItems: 'center' },
    sendButtonText: { color: '#fff', fontWeight: 'bold' },
    logoutButton: { backgroundColor: '#ff4444', padding: 10, borderRadius: 5, alignItems: 'center' },
    logoutButtonText: { color: '#fff', fontWeight: 'bold' }
});
