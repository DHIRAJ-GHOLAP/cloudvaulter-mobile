import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

import { authApi } from '../../lib/api';
import { Colors } from '../../constants/colors';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { colors } = useTheme();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    backButton: {
      padding: 8,
    },
    content: {
      padding: 24,
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.foreground,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.muted,
      marginBottom: 32,
    },
    inputContainer: {
      marginBottom: 24,
    },
    label: {
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 8,
      fontWeight: '500',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 56,
    },
    input: {
      flex: 1,
      color: colors.foreground,
      fontSize: 16,
    },
    button: {
      backgroundColor: colors.primary,
      height: 56,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    error: {
      color: 'red',
      marginBottom: 16,
      textAlign: 'center',
    },
    successContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    successIcon: {
      marginBottom: 16,
    },
    successText: {
      fontSize: 18,
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: 32,
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          {success ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={80} color={colors.primary} style={styles.successIcon} />
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.successText}>We've sent password reset instructions to {email}</Text>
              <TouchableOpacity 
                style={[styles.button, { width: '100%' }]} 
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.buttonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Enter your email address and we'll send you a link to reset your password.</Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.button} 
                onPress={handleReset}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
