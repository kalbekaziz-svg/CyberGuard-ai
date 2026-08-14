import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

export default function AdminScreen() {
    const [stats, setStats] = useState(null);
    const [token, setToken] = useState('');

    useEffect(() => {
        const loadStats = async () => {
            const t = await AsyncStorage.getItem('token');
            setToken(t);
            try {
                const res = await API.get('/admin/stats', { headers: { Authorization: `Bearer ${t}` } });
                setStats(res.data);
            } catch (err) {
                Alert.alert('Error', 'Failed to load stats');
            }
        };
        loadStats();
    }, []);

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>📊 Admin Panel</Text>
            {stats ? (
                <>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Total Requests</Text>
                        <Text style={styles.statValue}>{stats.totalRequests}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Total Users</Text>
                        <Text style={styles.statValue}>{stats.totalUsers}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Avg Response Time</Text>
                        <Text style={styles.statValue}>{stats.avgResponseTime}ms</Text>
                    </View>
                </>
            ) : (
                <Text style={styles.loading}>Loading...</Text>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0e27', padding: 15 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
    statBox: { backgroundColor: '#1a1f3a', padding: 15, borderRadius: 10, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: '#0096ff' },
    statLabel: { color: '#aaa', fontSize: 14 },
    statValue: { color: '#0096ff', fontSize: 28, fontWeight: 'bold', marginTop: 5 },
    loading: { color: '#fff', textAlign: 'center', marginTop: 20 }
});
