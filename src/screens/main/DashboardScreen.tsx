import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { dashboardApi, walletApi, filesApi } from '../../lib/api';
import { formatBytes, formatCurrency, formatDate, getFileIcon, getFileColor } from '../../lib/utils';
import { Colors } from '../../constants/colors';

export default function DashboardScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user, refreshUser } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFiles: 0,
    storageUsedBytes: 0,
    walletBalance: 0,
    apiCalls: 0,
  });
  const [recentFiles, setRecentFiles] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [dashRes, walletRes, filesRes] = await Promise.allSettled([
        dashboardApi.getStats(),
        walletApi.getBalance(),
        filesApi.list(),
      ]);

      const dashData = dashRes.status === 'fulfilled' ? dashRes.value : null;
      const walletData = walletRes.status === 'fulfilled' ? walletRes.value : null;
      const filesData = filesRes.status === 'fulfilled' ? filesRes.value : null;

      const totalFiles = dashData?.total_files ?? dashData?.fileCount ?? filesData?.files?.length ?? 0;
      const storageBytes = dashData?.storage_used ?? dashData?.totalStorage ?? 0;
      const balance = walletData?.balance ?? user?.walletBalance ?? 0;
      const apiCalls = dashData?.api_calls ?? dashData?.apiCalls ?? 0;

      setStats({
        totalFiles,
        storageUsedBytes: storageBytes,
        walletBalance: balance,
        apiCalls,
      });

      if (filesData?.files) {
        setRecentFiles(filesData.files.slice(0, 5));
      }
    } catch (error) {
      console.warn('Dashboard data fetch error', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshUser()]);
    setRefreshing(false);
  }, []);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.foreground }]}>
              Hello, {user?.name || 'User'}!
            </Text>
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{todayStr}</Text>
          </View>
          <TouchableOpacity
            style={[styles.profileAvatar, { backgroundColor: 'rgba(255, 107, 0, 0.15)' }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.avatarText}>
              {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Email Verification Warning Banner */}
        {user && user.email_verified === false ? (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={20} color="#D97706" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Email Unverified</Text>
              <Text style={styles.warningBody}>Please verify your email address to enable all features.</Text>
            </View>
          </View>
        ) : null}

        {/* Wallet Balance Hero Card */}
        <TouchableOpacity
          style={styles.walletHeroCard}
          onPress={() => navigation.navigate('Billing')}
          activeOpacity={0.9}
        >
          <View style={styles.walletHeroHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.walletIconCircle}>
                <Ionicons name="wallet" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.walletHeroTitle}>Available Balance</Text>
            </View>
            <View style={styles.topUpPill}>
              <Text style={styles.topUpPillText}>+ Top Up</Text>
            </View>
          </View>
          <Text style={styles.walletHeroAmount}>
            {formatCurrency(stats.walletBalance)}
          </Text>
          <Text style={styles.walletHeroSub}>Pay-as-you-go billing • Auto-renew active</Text>
        </TouchableOpacity>

        {/* Stat Cards Grid */}
        <View style={styles.statsGrid}>
          {/* Storage Used */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(255, 107, 0, 0.12)' }]}>
              <Ionicons name="cloud-done-outline" size={22} color={Colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {formatBytes(stats.storageUsedBytes)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Storage Used</Text>
          </View>

          {/* Total Files */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(14, 165, 233, 0.12)' }]}>
              <Ionicons name="folder-open-outline" size={22} color="#0EA5E9" />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stats.totalFiles}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Files</Text>
          </View>

          {/* API Calls */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(124, 58, 237, 0.12)' }]}>
              <Ionicons name="code-slash-outline" size={22} color="#7C3AED" />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {stats.apiCalls.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>API Requests</Text>
          </View>

          {/* Active Vault */}
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(22, 163, 74, 0.12)' }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#16A34A" />
            </View>
            <Text style={[styles.statValue, { color: colors.foreground }]}>Active</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Vault Status</Text>
          </View>
        </View>

        {/* Emergency Vault Card Banner */}
        <TouchableOpacity
          style={[styles.emergencyBanner, { borderColor: '#FF6B00' }]}
          onPress={() => navigation.navigate('EmergencyVault')}
          activeOpacity={0.88}
        >
          <View style={styles.emergencyIconWrap}>
            <Ionicons name="shield-checkmark" size={26} color="#FF6B00" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.emergencyTitle, { color: colors.foreground }]}>Emergency Life Vault</Text>
            <Text style={[styles.emergencySub, { color: colors.mutedForeground }]}>
              QR card, 4-digit PIN & first responder recovery
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FF6B00" />
        </TouchableOpacity>

        {/* Quick Actions Row */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        </View>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Developer')}
          >
            <Ionicons name="code-slash" size={24} color="#7C3AED" />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Dev API</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('EmergencyVault')}
          >
            <Ionicons name="shield-checkmark" size={24} color="#FF6B00" />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Emergency</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Files', { openUpload: true })}
          >
            <Ionicons name="cloud-upload" size={24} color={Colors.primary} />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Upload</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Billing')}
          >
            <Ionicons name="card" size={24} color="#16A34A" />
            <Text style={[styles.quickActionText, { color: colors.foreground }]}>Billing</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Files */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Files</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Files')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 20 }} />
        ) : recentFiles.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="folder-open-outline" size={40} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No files yet</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              Tap the upload button above to add your first file
            </Text>
          </View>
        ) : (
          recentFiles.map((file) => {
            const iconName = getFileIcon(file.content_type || file.type || '');
            const iconColor = getFileColor(file.content_type || file.type || '');
            return (
              <TouchableOpacity
                key={file.id || file._id}
                style={[styles.fileRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('FilePreview', { file })}
                activeOpacity={0.7}
              >
                <View style={[styles.fileIconWrapper, { backgroundColor: `${iconColor}18` }]}>
                  <Ionicons name={iconName as any} size={22} color={iconColor} />
                </View>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
                    {file.filename || file.name || 'Untitled'}
                  </Text>
                  <Text style={[styles.fileMeta, { color: colors.mutedForeground }]}>
                    {formatBytes(file.size || 0)} • {formatDate(file.created_at || file.updated_at)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  dateText: {
    fontSize: 13,
    marginTop: 2,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
  },
  warningTitle: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: '700',
  },
  warningBody: {
    color: '#D97706',
    fontSize: 12,
    marginTop: 1,
  },
  walletHeroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  walletHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  walletHeroTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  topUpPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  topUpPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  walletHeroAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  walletHeroSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionBtn: {
    width: '23%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  fileIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  fileMeta: {
    fontSize: 12,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,107,0,0.08)',
    marginBottom: 20,
  },
  emergencyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emergencySub: {
    fontSize: 12,
    marginTop: 2,
  },
});
