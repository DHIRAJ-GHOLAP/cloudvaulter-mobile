import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/colors';

export default function ProfileScreen() {
  const { colors, isDark, theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout }
    ]);
  };

  const handleToggleTheme = () => {
    Alert.alert('Select Theme', 'Choose your preferred appearance', [
      { text: 'Light', onPress: () => setTheme('light') },
      { text: 'Dark', onPress: () => setTheme('dark') },
      { text: 'System Default', onPress: () => setTheme('system') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );

  const renderRow = (icon: string, title: string, onPress?: () => void, rightText?: string, danger = false) => (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={icon as any} size={22} color={danger ? '#DC2626' : Colors.primary} style={styles.rowIcon} />
        <Text style={[styles.rowTitle, { color: danger ? '#DC2626' : colors.foreground }]}>{title}</Text>
      </View>
      <View style={styles.rowRight}>
        {rightText && <Text style={[styles.rightText, { color: colors.mutedForeground }]}>{rightText}</Text>}
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{user?.name || 'User'}</Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email || 'user@example.com'}</Text>
          
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.foreground }]}>{user?.role?.toUpperCase() || 'USER'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderColor: 'rgba(22, 163, 74, 0.3)' }]}>
              <Text style={[styles.badgeText, { color: '#16A34A' }]}>Active Vault</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          {renderSectionHeader('ACCOUNT')}
          {renderRow('shield-checkmark-outline', 'Emergency Life Vault & QR Card', () => navigation.navigate('EmergencyVault'))}
          {renderRow('person-outline', 'Edit Profile', () => Alert.alert('Edit Profile', 'Profile editing is active on your web dashboard.'))}
          {renderRow('lock-closed-outline', 'Change Password', () => Alert.alert('Change Password', 'Use the password reset link on login or web dashboard.'))}
          {renderRow('mail-outline', 'Email Preferences', () => Alert.alert('Email Preferences', 'Email notifications are enabled.'))}
        </View>

        <View style={styles.section}>
          {renderSectionHeader('APP SETTINGS')}
          {renderRow('color-palette-outline', 'Theme', handleToggleTheme, theme === 'system' ? 'System' : isDark ? 'Dark' : 'Light')}
          {renderRow('notifications-outline', 'Notifications', () => Alert.alert('Notifications', 'Push notifications enabled.'))}
        </View>

        <View style={styles.section}>
          {renderSectionHeader('DEVELOPER')}
          {renderRow('key-outline', 'API Keys & Stats', () => navigation.navigate('Developer'))}
          {renderRow('document-text-outline', 'API Documentation', () => Alert.alert('API Docs', 'Available at https://api.cloudvaulter.space/docs'))}
        </View>

        <View style={styles.section}>
          {renderSectionHeader('SUPPORT')}
          {renderRow('help-circle-outline', 'Help & FAQ')}
          {renderRow('chatbubble-outline', 'Contact Support')}
          {renderRow('shield-checkmark-outline', 'Privacy Policy')}
          {renderRow('document-outline', 'Terms of Service')}
        </View>

        <View style={styles.section}>
          {renderSectionHeader('DANGER ZONE')}
          {renderRow('trash-outline', 'Delete Account', () => Alert.alert('Delete Account', 'Please contact support to permanently delete your account.'), undefined, true)}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>CloudVaulter Mobile v1.0.0 (Build 1)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', paddingVertical: 28, borderBottomWidth: 1 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText: { color: '#FFF', fontSize: 28, fontWeight: 'bold' },
  name: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 14, marginBottom: 12 },
  badgeContainer: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  section: { marginTop: 20 },
  sectionHeader: { fontSize: 12, fontWeight: '700', marginLeft: 16, marginBottom: 8, letterSpacing: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { marginRight: 14 },
  rowTitle: { fontSize: 15, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rightText: { marginRight: 8, fontSize: 13 },
  logoutButton: { margin: 24, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DC2626', alignItems: 'center', backgroundColor: 'rgba(220, 38, 38, 0.08)' },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', marginBottom: 32, fontSize: 12 },
});
