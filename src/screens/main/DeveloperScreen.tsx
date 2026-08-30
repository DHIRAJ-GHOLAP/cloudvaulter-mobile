import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { developerApi } from '../../lib/api';
import { formatBytes, formatDate } from '../../lib/utils';
import { Colors } from '../../constants/colors';

export default function DeveloperScreen() {
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'keys' | 'usage'>('keys');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Keys state
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // Usage state
  const [usageStats, setUsageStats] = useState<any>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const data = await developerApi.getApiKeys();
      setApiKeys(Array.isArray(data) ? data : (data as any)?.keys || []);
    } catch (error) {
      console.warn('Error fetching API keys:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      const data = await developerApi.getUsage();
      setUsageStats(data);
    } catch (error) {
      console.warn('Error fetching usage stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'keys') fetchKeys();
    if (activeTab === 'usage') fetchUsage();
  }, [activeTab, fetchKeys, fetchUsage]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'keys') fetchKeys();
    else fetchUsage();
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      Alert.alert('Error', 'Please enter a name for your API Key');
      return;
    }
    try {
      setLoading(true);
      const res = await developerApi.createApiKey(newKeyName.trim());
      setNewKeyName('');
      setModalVisible(false);
      if (res?.key || res?.api_key) {
        setCreatedKey(res.key || res.api_key);
      }
      await fetchKeys();
    } catch (err: any) {
      Alert.alert('Creation Failed', err?.message || 'Could not create API Key.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = (keyId: string) => {
    Alert.alert('Revoke Key', 'Are you sure you want to revoke this API Key? Any requests using it will immediately fail.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await developerApi.deleteApiKey(keyId);
            await fetchKeys();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to delete key.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'keys' && { borderBottomColor: Colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('keys')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'keys' ? Colors.primary : colors.mutedForeground }]}>
            API Keys
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'usage' && { borderBottomColor: Colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('usage')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'usage' ? Colors.primary : colors.mutedForeground }]}>
            Usage & Analytics
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Created Key Banner */}
        {createdKey ? (
          <View style={styles.createdKeyBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={styles.createdKeyTitle}>API Key Created Successfully!</Text>
            </View>
            <Text style={styles.createdKeySub}>Copy and store it now. You won't be able to see it again.</Text>
            <View style={styles.keyDisplayBox}>
              <Text style={styles.keyDisplayText} selectable>{createdKey}</Text>
            </View>
            <TouchableOpacity style={styles.dismissKeyBtn} onPress={() => setCreatedKey(null)}>
              <Text style={styles.dismissKeyBtnText}>I've saved my key</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : activeTab === 'keys' ? (
          <View>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.createBtnText}>Create New API Key</Text>
            </TouchableOpacity>

            {apiKeys.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="key-outline" size={48} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No API keys generated</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Generate an API key to integrate CloudVaulter with your apps and pipelines
                </Text>
              </View>
            ) : (
              apiKeys.map((k) => (
                <View key={k.id || k._id} style={[styles.keyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.keyHeader}>
                    <Text style={[styles.keyName, { color: colors.foreground }]}>{k.name || 'Default Key'}</Text>
                    <Text style={[styles.keyDate, { color: colors.mutedForeground }]}>
                      {formatDate(k.created_at || k.createdAt)}
                    </Text>
                  </View>
                  <View style={[styles.keyBody, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.keyText, { color: colors.foreground }]} numberOfLines={1}>
                      {k.masked_key || (k.key ? `${k.key.substring(0, 8)}••••••••••••••••` : 'cv_live_••••••••••••')}
                    </Text>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteKey(k.id || k._id)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View>
            <View style={[styles.usageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.usageTitle, { color: colors.foreground }]}>API Metrics</Text>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Requests (Month)</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {(usageStats?.total_calls ?? usageStats?.monthlyCalls ?? 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Data Transfer</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {formatBytes(usageStats?.bandwidth ?? 0)}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Requests Today</Text>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {(usageStats?.today_calls ?? usageStats?.todayCalls ?? 0).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Generate API Key</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="e.g. Production Server, Backup Bot"
              placeholderTextColor={colors.mutedForeground}
              value={newKeyName}
              onChangeText={setNewKeyName}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateKey} style={[styles.submitBtn, { backgroundColor: Colors.primary }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Generate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontWeight: '600', fontSize: 14 },
  content: { flex: 1, padding: 16 },
  createBtn: { flexDirection: 'row', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  createBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  createdKeyBanner: { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderWidth: 1, borderColor: 'rgba(22, 163, 74, 0.3)', borderRadius: 12, padding: 16, marginBottom: 20 },
  createdKeyTitle: { color: '#16A34A', fontSize: 15, fontWeight: '700' },
  createdKeySub: { color: '#16A34A', fontSize: 12, marginBottom: 10 },
  keyDisplayBox: { backgroundColor: '#1A1714', borderRadius: 8, padding: 12, marginBottom: 10 },
  keyDisplayText: { color: '#FF6B00', fontFamily: 'monospace', fontSize: 13 },
  dismissKeyBtn: { alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#16A34A', borderRadius: 8 },
  dismissKeyBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  keyCard: { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  keyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  keyName: { fontSize: 15, fontWeight: '600' },
  keyDate: { fontSize: 12 },
  keyBody: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1 },
  keyText: { flex: 1, fontFamily: 'monospace', fontSize: 13 },
  iconButton: { padding: 6 },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySub: { fontSize: 13, textAlign: 'center' },
  usageCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  usageTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' },
  statLabel: { fontSize: 14 },
  statValue: { fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 16, padding: 20, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  submitBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
});
