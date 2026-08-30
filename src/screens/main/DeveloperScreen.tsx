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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../context/ThemeContext';
import { developerApi } from '../../lib/api';
import { formatBytes, formatDate } from '../../lib/utils';
import { Colors } from '../../constants/colors';

type TabType = 'keys' | 'buckets' | 'templates' | 'webhooks' | 'logs';

export default function DeveloperScreen() {
  const { colors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('keys');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ─── KEYS STATE ─────────────────────────────────────────────────────────────
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState('secret');
  const [newKeyEnv, setNewKeyEnv] = useState('production');
  const [newKeyBudget, setNewKeyBudget] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'storage.read',
    'storage.write',
    'files.upload',
  ]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  // ─── BUCKETS STATE ──────────────────────────────────────────────────────────
  const [buckets, setBuckets] = useState<any[]>([]);
  const [showBucketModal, setShowBucketModal] = useState(false);
  const [bucketName, setBucketName] = useState('');
  const [bucketDesc, setBucketDesc] = useState('');
  const [bucketVisibility, setBucketVisibility] = useState('private');
  const [bucketMaxSize, setBucketMaxSize] = useState('50');
  const [bucketAutoOcr, setBucketAutoOcr] = useState(false);
  const [bucketEncryption, setBucketEncryption] = useState(true);

  // ─── TEMPLATES STATE ────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState<'curl' | 'js' | 'python' | 's3'>('curl');

  // ─── WEBHOOKS STATE ─────────────────────────────────────────────────────────
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookDesc, setWebhookDesc] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['file.uploaded']);

  // ─── LOGS & USAGE STATE ─────────────────────────────────────────────────────
  const [logs, setLogs] = useState<any[]>([]);
  const [usageStats, setUsageStats] = useState<any>(null);

  // ─── DATA FETCHERS ──────────────────────────────────────────────────────────
  const fetchKeys = useCallback(async () => {
    try {
      const data = await developerApi.getApiKeys();
      setApiKeys(Array.isArray(data) ? data : (data as any)?.keys || []);
    } catch (error) {
      console.warn('Error fetching API keys:', error);
    }
  }, []);

  const fetchBuckets = useCallback(async () => {
    try {
      const data = await developerApi.getBuckets();
      setBuckets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('Error fetching buckets:', error);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const data = await developerApi.getTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('Error fetching templates:', error);
    }
  }, []);

  const fetchWebhooks = useCallback(async () => {
    try {
      const data = await developerApi.getWebhooks();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('Error fetching webhooks:', error);
    }
  }, []);

  const fetchLogsAndUsage = useCallback(async () => {
    try {
      const [logsData, usageData] = await Promise.allSettled([
        developerApi.getLogs(50),
        developerApi.getUsage(),
      ]);
      if (logsData.status === 'fulfilled') {
        setLogs(Array.isArray(logsData.value) ? logsData.value : []);
      }
      if (usageData.status === 'fulfilled') {
        setUsageStats(usageData.value);
      }
    } catch (error) {
      console.warn('Error fetching logs & usage:', error);
    }
  }, []);

  const loadCurrentTab = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'keys') await fetchKeys();
    else if (activeTab === 'buckets') await fetchBuckets();
    else if (activeTab === 'templates') await fetchTemplates();
    else if (activeTab === 'webhooks') await fetchWebhooks();
    else if (activeTab === 'logs') await fetchLogsAndUsage();
    setLoading(false);
    setRefreshing(false);
  }, [activeTab, fetchKeys, fetchBuckets, fetchTemplates, fetchWebhooks, fetchLogsAndUsage]);

  useEffect(() => {
    loadCurrentTab();
  }, [loadCurrentTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCurrentTab();
  };

  const copyToClipboard = async (text: string, label = 'Copied to clipboard') => {
    await Clipboard.setStringAsync(text);
    Toast.show({
      type: 'success',
      text1: 'Copied!',
      text2: label,
      position: 'bottom',
    });
  };

  // ─── KEY ACTIONS ────────────────────────────────────────────────────────────
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      Alert.alert('Required', 'Please enter a name for your API key');
      return;
    }
    try {
      setLoading(true);
      const res = await developerApi.createApiKey({
        name: newKeyName.trim(),
        key_type: newKeyType,
        environment: newKeyEnv,
        scopes: selectedScopes,
        budget_limit_inr: newKeyBudget ? Number(newKeyBudget) : undefined,
      });
      setNewKeyName('');
      setNewKeyBudget('');
      setShowKeyModal(false);
      if (res?.api_key || res?.key) {
        setCreatedKey(res.api_key || res.key);
      }
      await fetchKeys();
    } catch (err: any) {
      Alert.alert('Creation Error', err?.response?.data?.detail || err?.message || 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = (keyId: string) => {
    Alert.alert('Revoke API Key', 'Are you sure? Any services using this key will immediately lose access.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            await developerApi.deleteApiKey(keyId);
            await fetchKeys();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not delete key');
          }
        },
      },
    ]);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  // ─── BUCKET ACTIONS ─────────────────────────────────────────────────────────
  const handleCreateBucket = async () => {
    if (!bucketName.trim()) {
      Alert.alert('Required', 'Please enter a bucket name (e.g. user-media)');
      return;
    }
    const cleanName = bucketName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    try {
      setLoading(true);
      await developerApi.createBucket({
        name: cleanName,
        description: bucketDesc.trim(),
        visibility: bucketVisibility,
        max_file_size_mb: Number(bucketMaxSize) || 50,
        auto_ocr: bucketAutoOcr,
        encryption: bucketEncryption,
      });
      setBucketName('');
      setBucketDesc('');
      setShowBucketModal(false);
      await fetchBuckets();
      Toast.show({
        type: 'success',
        text1: 'Bucket Created',
        text2: `Namespace ${cleanName} is ready`,
      });
    } catch (err: any) {
      Alert.alert('Creation Error', err?.response?.data?.detail || err?.message || 'Failed to create bucket');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBucket = (id: string, name: string) => {
    Alert.alert('Delete Namespace', `Delete bucket "${name}" and all its configuration?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await developerApi.deleteBucket(id);
            await fetchBuckets();
          } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not delete bucket');
          }
        },
      },
    ]);
  };

  // ─── WEBHOOK ACTIONS ────────────────────────────────────────────────────────
  const handleCreateWebhook = async () => {
    if (!webhookUrl.trim() || !webhookUrl.startsWith('http')) {
      Alert.alert('Invalid URL', 'Please enter a valid HTTP/HTTPS endpoint URL');
      return;
    }
    try {
      setLoading(true);
      await developerApi.createWebhook({
        url: webhookUrl.trim(),
        description: webhookDesc.trim(),
        events: webhookEvents,
      });
      setWebhookUrl('');
      setWebhookDesc('');
      setShowWebhookModal(false);
      await fetchWebhooks();
      Toast.show({
        type: 'success',
        text1: 'Webhook Registered',
        text2: 'Events will be dispatched in real-time',
      });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || err?.message || 'Failed to register webhook');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebhook = (id: string) => {
    Alert.alert('Remove Webhook', 'Delete this webhook destination?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await developerApi.deleteWebhook(id);
            await fetchWebhooks();
          } catch {}
        },
      },
    ]);
  };

  const toggleWebhookEvent = (ev: string) => {
    setWebhookEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]
    );
  };

  // ─── SAMPLE CODE SNIPPET GENERATOR ──────────────────────────────────────────
  const activeTemplate = templates[selectedTemplateIndex] || {
    id: 's3-upload',
    name: 'S3-Compatible Upload & Store',
    description: 'Upload files via S3 SDK or standard HTTPS REST endpoints.',
    category: 'storage',
    code_samples: {
      curl: `curl -X POST "https://api.cloudvaulter.space/api/v1/files/upload" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -F "file=@document.pdf"`,
      js: `import axios from 'axios';\nimport FormData from 'form-data';\nimport fs from 'fs';\n\nconst form = new FormData();\nform.append('file', fs.createReadStream('./document.pdf'));\n\nconst res = await axios.post('https://api.cloudvaulter.space/api/v1/files/upload', form, {\n  headers: {\n    ...form.getHeaders(),\n    Authorization: 'Bearer ' + process.env.CLOUDVAULT_KEY\n  }\n});\nconsole.log(res.data);`,
      python: `import requests\n\nurl = "https://api.cloudvaulter.space/api/v1/files/upload"\nheaders = {"Authorization": "Bearer YOUR_API_KEY"}\n\nwith open("document.pdf", "rb") as f:\n    response = requests.post(url, headers=headers, files={"file": f})\n\nprint(response.json())`,
      s3: `import boto3\n\ns3 = boto3.client(\n    's3',\n    endpoint_url='https://api.cloudvaulter.space/api/v1/s3',\n    aws_access_key_id='YOUR_API_KEY',\n    aws_secret_access_key='YOUR_SECRET_KEY'\n)\n\ns3.upload_file('invoice.pdf', 'my-bucket', 'invoice.pdf')`,
    },
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Top Segment Tabs */}
      <View style={[styles.tabBarWrapper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { id: 'keys', label: 'API Keys', icon: 'key' },
            { id: 'buckets', label: 'Buckets', icon: 'cube' },
            { id: 'templates', label: 'Starters', icon: 'code-slash' },
            { id: 'webhooks', label: 'Webhooks', icon: 'git-network' },
            { id: 'logs', label: 'Live Logs', icon: 'pulse' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                activeTab === tab.id && { borderBottomColor: Colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(tab.id as TabType)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.id ? Colors.primary : colors.mutedForeground}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabItemText,
                  { color: activeTab === tab.id ? Colors.primary : colors.mutedForeground },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
        {/* ─── TAB 1: API KEYS ─────────────────────────────────────────────────── */}
        {activeTab === 'keys' && (
          <View>
            {/* Newly Created Key Alert Banner */}
            {createdKey ? (
              <View style={styles.createdKeyBanner}>
                <View style={styles.bannerHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                  <Text style={styles.createdKeyTitle}>API Key Generated</Text>
                </View>
                <Text style={styles.createdKeySub}>
                  Copy and store this secret key safely now. It will not be shown again.
                </Text>
                <View style={styles.keyDisplayBox}>
                  <Text style={styles.keyDisplayText} selectable>{createdKey}</Text>
                  <TouchableOpacity
                    style={styles.keyCopyBtn}
                    onPress={() => copyToClipboard(createdKey, 'API Key copied')}
                  >
                    <Ionicons name="copy-outline" size={16} color="#FF6B00" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.dismissKeyBtn} onPress={() => setCreatedKey(null)}>
                  <Text style={styles.dismissKeyBtnText}>I have saved my key</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Create Key Trigger Button */}
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setShowKeyModal(true)}
              activeOpacity={0.88}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionBtnText}>Create New API Key</Text>
            </TouchableOpacity>

            {loading && !refreshing ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : apiKeys.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="key-outline" size={48} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No API keys generated</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Generate programmable secret, publishable, or restricted keys for your backend services and client apps.
                </Text>
              </View>
            ) : (
              apiKeys.map((key) => (
                <View
                  key={key.id || key._id}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{key.name}</Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.miniBadge, { backgroundColor: 'rgba(255,107,0,0.15)' }]}>
                          <Text style={[styles.miniBadgeText, { color: Colors.primary }]}>
                            {(key.key_type || 'secret').toUpperCase()}
                          </Text>
                        </View>
                        <View style={[styles.miniBadge, { backgroundColor: colors.background }]}>
                          <Text style={[styles.miniBadgeText, { color: colors.mutedForeground }]}>
                            {key.environment || 'production'}
                          </Text>
                        </View>
                        {key.budget_limit_inr ? (
                          <View style={[styles.miniBadge, { backgroundColor: 'rgba(22,163,74,0.15)' }]}>
                            <Text style={[styles.miniBadgeText, { color: '#16A34A' }]}>
                              Cap: ₹{key.budget_limit_inr}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteKey(key.id || key._id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.codePill, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => copyToClipboard(key.prefix || key.api_key || '', 'Key prefix copied')}
                  >
                    <Text style={[styles.codePillText, { color: Colors.primary }]}>
                      {key.prefix || (key.api_key ? `${key.api_key.substring(0, 16)}...` : 'cv_key_****')}
                    </Text>
                    <Ionicons name="copy-outline" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>

                  <View style={styles.cardFooter}>
                    <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                      Created {formatDate(key.created_at)}
                    </Text>
                    <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
                      {key.scopes?.length || 0} IAM actions
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── TAB 2: BUCKETS / NAMESPACES ──────────────────────────────────────── */}
        {activeTab === 'buckets' && (
          <View>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setShowBucketModal(true)}
              activeOpacity={0.88}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionBtnText}>Create Storage Namespace</Text>
            </TouchableOpacity>

            {loading && !refreshing ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : buckets.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="cube-outline" size={48} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No buckets created</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Organize files into isolated namespaces with custom size caps, encryption, and automatic OCR pipelines.
                </Text>
              </View>
            ) : (
              buckets.map((b) => (
                <View
                  key={b.id || b._id}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{b.name}</Text>
                      <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {b.description || 'Isolated storage bucket'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteBucket(b.id || b._id, b.name)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.badgeRow}>
                    <View style={[styles.miniBadge, { backgroundColor: 'rgba(14,165,233,0.15)' }]}>
                      <Text style={[styles.miniBadgeText, { color: '#0EA5E9' }]}>
                        {(b.visibility || 'private').toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.miniBadge, { backgroundColor: colors.background }]}>
                      <Text style={[styles.miniBadgeText, { color: colors.foreground }]}>
                        Max {b.max_file_size_mb || 50} MB
                      </Text>
                    </View>
                    {b.auto_ocr && (
                      <View style={[styles.miniBadge, { backgroundColor: 'rgba(124,58,237,0.15)' }]}>
                        <Text style={[styles.miniBadgeText, { color: '#7C3AED' }]}>Auto-OCR</Text>
                      </View>
                    )}
                    {b.encryption && (
                      <View style={[styles.miniBadge, { backgroundColor: 'rgba(22,163,74,0.15)' }]}>
                        <Text style={[styles.miniBadgeText, { color: '#16A34A' }]}>AES-256</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── TAB 3: STARTER TEMPLATES & SDK GENERATOR ─────────────────────────── */}
        {activeTab === 'templates' && (
          <View>
            <Text style={[styles.sectionHeading, { color: colors.foreground }]}>SDK & Code Generator</Text>
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
              Plug CloudVaulter into your backend services and mobile apps in seconds.
            </Text>

            {/* Template Selector Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {(templates.length > 0
                ? templates
                : [
                    { id: 's3-upload', name: 'S3 REST Uploader' },
                    { id: 'ocr-doc', name: 'Document OCR' },
                    { id: 'signed-url', name: 'Presigned Links' },
                    { id: 'boto3-sdk', name: 'Python Boto3' },
                  ]
              ).map((t, idx) => (
                <TouchableOpacity
                  key={t.id || idx}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: selectedTemplateIndex === idx ? Colors.primary : colors.card,
                      borderColor: selectedTemplateIndex === idx ? Colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedTemplateIndex(idx)}
                >
                  <Text
                    style={[
                      styles.chipBtnText,
                      { color: selectedTemplateIndex === idx ? '#FFFFFF' : colors.foreground },
                    ]}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Language Selector */}
            <View style={[styles.langBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {(['curl', 'js', 'python', 's3'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.langBtn,
                    selectedLang === lang && { backgroundColor: Colors.primary },
                  ]}
                  onPress={() => setSelectedLang(lang)}
                >
                  <Text
                    style={[
                      styles.langBtnText,
                      { color: selectedLang === lang ? '#FFFFFF' : colors.mutedForeground },
                    ]}
                  >
                    {lang === 'curl' ? 'cURL' : lang === 'js' ? 'Node.js' : lang === 'python' ? 'Python' : 'Boto3'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Code Box */}
            <View style={styles.codeSnippetBox}>
              <View style={styles.codeSnippetHeader}>
                <Text style={styles.codeSnippetTitle}>
                  {selectedLang.toUpperCase()} CODE SAMPLE
                </Text>
                <TouchableOpacity
                  style={styles.copySnippetBtn}
                  onPress={() =>
                    copyToClipboard(
                      activeTemplate.code_samples?.[selectedLang] || activeTemplate.code || '',
                      'Code snippet copied'
                    )
                  }
                >
                  <Ionicons name="copy-outline" size={14} color="#FF6B00" style={{ marginRight: 4 }} />
                  <Text style={styles.copySnippetText}>Copy</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.codeSnippetContent} selectable>
                {activeTemplate.code_samples?.[selectedLang] || activeTemplate.code || '// Code sample loading...'}
              </Text>
            </View>
          </View>
        )}

        {/* ─── TAB 4: WEBHOOKS ─────────────────────────────────────────────────── */}
        {activeTab === 'webhooks' && (
          <View>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: Colors.primary }]}
              onPress={() => setShowWebhookModal(true)}
              activeOpacity={0.88}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionBtnText}>Register Webhook Endpoint</Text>
            </TouchableOpacity>

            {loading && !refreshing ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : webhooks.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="git-network-outline" size={48} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Webhooks Configured</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Receive real-time HTTP POST notifications whenever files are uploaded, OCR finishes, or buckets change.
                </Text>
              </View>
            ) : (
              webhooks.map((w) => (
                <View
                  key={w.id || w._id}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.cardTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                        {w.url}
                      </Text>
                      <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                        {w.description || 'Webhook Listener'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteWebhook(w.id || w._id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.badgeRow}>
                    {(w.events || ['file.uploaded']).map((ev: string) => (
                      <View key={ev} style={[styles.miniBadge, { backgroundColor: 'rgba(255,107,0,0.12)' }]}>
                        <Text style={[styles.miniBadgeText, { color: Colors.primary }]}>{ev}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── TAB 5: LIVE LOGS & METRICS ──────────────────────────────────────── */}
        {activeTab === 'logs' && (
          <View>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>API Calls</Text>
                <Text style={[styles.metricVal, { color: colors.foreground }]}>
                  {usageStats?.api_calls_count ?? usageStats?.total_calls ?? logs.length}
                </Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>Bandwidth</Text>
                <Text style={[styles.metricVal, { color: colors.foreground }]}>
                  {formatBytes(usageStats?.bandwidth_bytes ?? 0)}
                </Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>Active Keys</Text>
                <Text style={[styles.metricVal, { color: Colors.primary }]}>{apiKeys.length}</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>Buckets</Text>
                <Text style={[styles.metricVal, { color: '#16A34A' }]}>{buckets.length}</Text>
              </View>
            </View>

            <Text style={[styles.sectionHeading, { color: colors.foreground, marginTop: 16 }]}>
              Recent Request Stream
            </Text>

            {loading && !refreshing ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : logs.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="pulse-outline" size={48} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Request Logs</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  API requests from SDKs, cURL, and mobile apps will stream here live.
                </Text>
              </View>
            ) : (
              logs.map((log, idx) => {
                const method = log.method || 'GET';
                const status = log.status_code || log.status || 200;
                const isSuccess = status >= 200 && status < 300;
                const methodColor =
                  method === 'GET'
                    ? '#0EA5E9'
                    : method === 'POST'
                    ? '#16A34A'
                    : method === 'DELETE'
                    ? '#DC2626'
                    : '#D97706';

                return (
                  <View
                    key={log.id || log._id || idx}
                    style={[styles.logItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.logTopRow}>
                      <View style={[styles.methodBadge, { backgroundColor: `${methodColor}20` }]}>
                        <Text style={[styles.methodText, { color: methodColor }]}>{method}</Text>
                      </View>
                      <Text style={[styles.logPath, { color: colors.foreground }]} numberOfLines={1}>
                        {log.path || log.endpoint || '/api/v1/files'}
                      </Text>
                      <Text style={[styles.statusText, { color: isSuccess ? '#16A34A' : '#DC2626' }]}>
                        {status}
                      </Text>
                    </View>
                    <View style={styles.logBottomRow}>
                      <Text style={[styles.logMeta, { color: colors.mutedForeground }]}>
                        {formatDate(log.timestamp || log.created_at)}
                      </Text>
                      {log.latency_ms && (
                        <Text style={[styles.logMeta, { color: colors.mutedForeground }]}>
                          {log.latency_ms}ms
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── MODAL: CREATE API KEY ────────────────────────────────────────────── */}
      <Modal visible={showKeyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalHeading, { color: colors.foreground }]}>Create API Key</Text>

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Key Name</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. Production Backend Uploader"
              placeholderTextColor={colors.mutedForeground}
              value={newKeyName}
              onChangeText={setNewKeyName}
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Key Type</Text>
            <View style={styles.typeRow}>
              {[
                { id: 'secret', label: 'Secret (sk)' },
                { id: 'publishable', label: 'Public (pk)' },
                { id: 'restricted', label: 'Restricted (rk)' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: newKeyType === t.id ? Colors.primary : colors.background,
                      borderColor: newKeyType === t.id ? Colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setNewKeyType(t.id)}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: newKeyType === t.id ? '#FFFFFF' : colors.foreground },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.foreground, marginTop: 12 }]}>
              Granular IAM Scopes
            </Text>
            <View style={styles.scopesWrap}>
              {[
                'storage.read',
                'storage.write',
                'files.upload',
                'vault.read',
                'vault.write',
                'ai.ocr',
              ].map((scope) => {
                const checked = selectedScopes.includes(scope);
                return (
                  <TouchableOpacity
                    key={scope}
                    style={[
                      styles.scopeChip,
                      {
                        backgroundColor: checked ? 'rgba(255,107,0,0.15)' : colors.background,
                        borderColor: checked ? Colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => toggleScope(scope)}
                  >
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={16}
                      color={checked ? Colors.primary : colors.mutedForeground}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.scopeChipText,
                        { color: checked ? Colors.primary : colors.foreground },
                      ]}
                    >
                      {scope}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowKeyModal(false)}>
                <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: Colors.primary }]}
                onPress={handleCreateKey}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Generate Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: CREATE BUCKET ─────────────────────────────────────────────── */}
      <Modal visible={showBucketModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalHeading, { color: colors.foreground }]}>Create Namespace</Text>

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Bucket Slug Name</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. user-media"
              placeholderTextColor={colors.mutedForeground}
              value={bucketName}
              onChangeText={setBucketName}
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Description</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Optional description"
              placeholderTextColor={colors.mutedForeground}
              value={bucketDesc}
              onChangeText={setBucketDesc}
            />

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>Auto-OCR Text Extraction</Text>
              <Switch
                value={bucketAutoOcr}
                onValueChange={setBucketAutoOcr}
                trackColor={{ true: Colors.primary, false: colors.border }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.foreground }]}>AES-256 Server Encryption</Text>
              <Switch
                value={bucketEncryption}
                onValueChange={setBucketEncryption}
                trackColor={{ true: Colors.primary, false: colors.border }}
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowBucketModal(false)}>
                <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: Colors.primary }]}
                onPress={handleCreateBucket}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Create Bucket</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: CREATE WEBHOOK ────────────────────────────────────────────── */}
      <Modal visible={showWebhookModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalHeading, { color: colors.foreground }]}>Register Webhook</Text>

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Payload URL</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="https://api.yourdomain.com/webhooks"
              placeholderTextColor={colors.mutedForeground}
              value={webhookUrl}
              onChangeText={setWebhookUrl}
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Subscribed Events</Text>
            <View style={styles.scopesWrap}>
              {['file.uploaded', 'file.deleted', 'ocr.completed', 'bucket.created'].map((ev) => {
                const checked = webhookEvents.includes(ev);
                return (
                  <TouchableOpacity
                    key={ev}
                    style={[
                      styles.scopeChip,
                      {
                        backgroundColor: checked ? 'rgba(255,107,0,0.15)' : colors.background,
                        borderColor: checked ? Colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => toggleWebhookEvent(ev)}
                  >
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={16}
                      color={checked ? Colors.primary : colors.mutedForeground}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.scopeChipText,
                        { color: checked ? Colors.primary : colors.foreground },
                      ]}
                    >
                      {ev}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowWebhookModal(false)}>
                <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: Colors.primary }]}
                onPress={handleCreateWebhook}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Add Webhook</Text>
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
  tabBarWrapper: { borderBottomWidth: 1 },
  tabScroll: { paddingHorizontal: 12 },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  tabItemText: { fontWeight: '700', fontSize: 13 },
  content: { flex: 1, padding: 16 },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  primaryActionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  createdKeyBanner: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderColor: 'rgba(22, 163, 74, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  createdKeyTitle: { color: '#16A34A', fontSize: 15, fontWeight: '700', marginLeft: 6 },
  createdKeySub: { color: '#16A34A', fontSize: 12, marginBottom: 12 },
  keyDisplayBox: {
    backgroundColor: '#1A1714',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  keyDisplayText: { color: '#FF6B00', fontFamily: 'monospace', fontSize: 12, flex: 1, marginRight: 8 },
  keyCopyBtn: { padding: 4 },
  dismissKeyBtn: { alignSelf: 'flex-end', backgroundColor: '#16A34A', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  dismissKeyBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  itemCard: { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSub: { fontSize: 12, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniBadgeText: { fontSize: 11, fontWeight: '700' },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 10,
  },
  codePillText: { fontFamily: 'monospace', fontSize: 12, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  dateText: { fontSize: 11 },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  sectionHeading: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionSub: { fontSize: 12, marginBottom: 16 },
  chipBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  chipBtnText: { fontSize: 12, fontWeight: '700' },
  langBar: { flexDirection: 'row', borderRadius: 10, padding: 4, borderWidth: 1, marginBottom: 12 },
  langBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  langBtnText: { fontSize: 12, fontWeight: '700' },
  codeSnippetBox: { backgroundColor: '#1A1714', borderRadius: 12, padding: 14 },
  codeSnippetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  codeSnippetTitle: { color: '#888', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  copySnippetBtn: { flexDirection: 'row', alignItems: 'center' },
  copySnippetText: { color: '#FF6B00', fontSize: 11, fontWeight: '700' },
  codeSnippetContent: { color: '#F7F6F4', fontFamily: 'monospace', fontSize: 12, lineHeight: 18 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { width: '48%', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  metricLabel: { fontSize: 12, marginBottom: 4 },
  metricVal: { fontSize: 20, fontWeight: '800' },
  logItem: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  logTopRow: { flexDirection: 'row', alignItems: 'center' },
  methodBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  methodText: { fontSize: 11, fontWeight: '800' },
  logPath: { flex: 1, fontSize: 13, fontWeight: '600', marginRight: 8 },
  statusText: { fontSize: 12, fontWeight: '800' },
  logBottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  logMeta: { fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 16, padding: 20, borderWidth: 1 },
  modalHeading: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  typeRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  typeBtnText: { fontSize: 11, fontWeight: '700' },
  scopesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  scopeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  scopeChipText: { fontSize: 11, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  switchLabel: { fontSize: 13, fontWeight: '600' },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  confirmBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
});
