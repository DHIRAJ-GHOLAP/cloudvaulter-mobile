import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { walletApi, usageApi, pricingApi } from '../../lib/api';
import { Colors } from '../../constants/colors';
import { formatBytes, formatCurrency, formatDate } from '../../lib/utils';

export default function BillingScreen() {
  const { colors, isDark } = useTheme();
  const { user, refreshUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'topup'>('overview');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [balance, setBalance] = useState(0);
  const [usage, setUsage] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Topup state
  const [topupAmount, setTopupAmount] = useState('100');
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [balanceData, usageData, pricingData] = await Promise.allSettled([
        walletApi.getBalance(),
        usageApi.getCurrent(),
        pricingApi.getConfig(),
      ]);
      
      if (balanceData.status === 'fulfilled') {
        setBalance(balanceData.value.balance ?? user?.walletBalance ?? 0);
      }
      if (usageData.status === 'fulfilled') {
        setUsage(usageData.value);
      }
      if (pricingData.status === 'fulfilled') {
        setPricing(pricingData.value);
      }
      await refreshUser();
    } catch (error) {
      console.warn('Error fetching billing data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.walletBalance, refreshUser]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await walletApi.getTransactions(0, 50);
      setTransactions(data.transactions || []);
    } catch (error) {
      console.warn('Error fetching transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') fetchData();
    if (activeTab === 'transactions') fetchTransactions();
  }, [activeTab, fetchData, fetchTransactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'overview') fetchData();
    else if (activeTab === 'transactions') fetchTransactions();
    else setRefreshing(false);
  };

  const handleTopUp = async () => {
    const num = Number(topupAmount);
    if (!topupAmount || isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to top up (min ₹10).');
      return;
    }
    
    try {
      setLoading(true);
      const data = await walletApi.createOrder(num);
      if (data) {
        Alert.alert(
          'Payment Gateway',
          `Order for ₹${num.toFixed(2)} generated successfully. Razorpay checkout will load.`,
          [{ text: 'OK', onPress: () => { fetchData(); setActiveTab('overview'); } }]
        );
      }
    } catch (error: any) {
      Alert.alert('Top Up Notice', error?.message || 'Could not initialize payment order.');
    } finally {
      setLoading(false);
    }
  };

  const storageUsedBytes = usage?.storage_bytes ?? usage?.storage ?? 0;
  const storageLimitBytes = usage?.storage_limit ?? usage?.storageLimit ?? (100 * 1024 * 1024 * 1024);
  const storagePercent = Math.min(Math.round((storageUsedBytes / (storageLimitBytes || 1)) * 100), 100);

  const storagePrice = pricing?.storage_price_per_gb ?? pricing?.storagePerGb ?? 1.5;
  const bandwidthPrice = pricing?.bandwidth_price_per_gb ?? pricing?.bandwidthPerGb ?? 0.25;
  const apiPrice = pricing?.api_price_per_10k ?? pricing?.apiPer10k ?? 1.0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Tab Switcher */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['overview', 'transactions', 'topup'] as const).map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[
              styles.tab, 
              activeTab === tab && { borderBottomColor: Colors.primary, borderBottomWidth: 2 }
            ]} 
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText, 
              { color: activeTab === tab ? Colors.primary : colors.mutedForeground }
            ]}>
              {tab === 'overview' ? 'Overview' : tab === 'transactions' ? 'History' : 'Top Up'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
        ) : activeTab === 'overview' ? (
          <View>
            {/* Wallet Balance Hero */}
            <View style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <Ionicons name="wallet-outline" size={24} color="#FFF" />
                <Text style={styles.walletBadge}>PAY AS YOU GO</Text>
              </View>
              <Text style={styles.walletTitle}>Available Balance</Text>
              <Text style={styles.walletBalance}>{formatCurrency(balance)}</Text>
              <TouchableOpacity 
                style={styles.walletTopupBtn}
                onPress={() => setActiveTab('topup')}
              >
                <Ionicons name="add-circle" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.walletTopupBtnText}>Add Funds</Text>
              </TouchableOpacity>
            </View>

            {/* Storage Usage Card */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Live Storage Usage</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardLabel, { color: colors.foreground }]}>Storage Space</Text>
                <Text style={[styles.cardVal, { color: Colors.primary }]}>{storagePercent}%</Text>
              </View>
              <View style={[styles.progressContainer, { backgroundColor: colors.border }]}>
                <View style={[styles.progressBar, { width: `${storagePercent}%` }]} />
              </View>
              <Text style={[styles.usageText, { color: colors.mutedForeground }]}>
                {formatBytes(storageUsedBytes)} of {formatBytes(storageLimitBytes)} used
              </Text>
            </View>

            {/* 2-Column Grid */}
            <View style={styles.grid}>
              <View style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.gridItemLabel, { color: colors.mutedForeground }]}>API Requests</Text>
                <Text style={[styles.gridItemValue, { color: colors.foreground }]}>
                  {usage?.api_calls ?? usage?.apiCalls ?? 0}
                </Text>
              </View>
              <View style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.gridItemLabel, { color: colors.mutedForeground }]}>Bandwidth</Text>
                <Text style={[styles.gridItemValue, { color: colors.foreground }]}>
                  {formatBytes(usage?.bandwidth_bytes ?? usage?.bandwidth ?? 0)}
                </Text>
              </View>
              <View style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.gridItemLabel, { color: colors.mutedForeground }]}>Files Stored</Text>
                <Text style={[styles.gridItemValue, { color: colors.foreground }]}>
                  {usage?.files_count ?? usage?.filesCount ?? 0}
                </Text>
              </View>
              <View style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.gridItemLabel, { color: colors.mutedForeground }]}>Billing Status</Text>
                <Text style={[styles.gridItemValue, { color: balance > 0 ? '#16A34A' : '#DC2626' }]}>
                  {balance > 0 ? 'Active' : 'Hold (₹0)'}
                </Text>
              </View>
            </View>

            {/* Pricing Rates */}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Transparent Pricing</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.foreground }]}>Storage Rate</Text>
                <Text style={[styles.priceValue, { color: colors.foreground }]}>₹{storagePrice} / GB / month</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: colors.foreground }]}>Bandwidth Rate</Text>
                <Text style={[styles.priceValue, { color: colors.foreground }]}>₹{bandwidthPrice} / GB</Text>
              </View>
              <View style={[styles.priceRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.priceLabel, { color: colors.foreground }]}>API Calls</Text>
                <Text style={[styles.priceValue, { color: colors.foreground }]}>₹{apiPrice} / 10k calls</Text>
              </View>
            </View>
          </View>
        ) : activeTab === 'transactions' ? (
          <View>
            {transactions.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="receipt-outline" size={48} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No transactions yet</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Your billing top-ups and deductions will appear here.</Text>
              </View>
            ) : (
              transactions.map((tx, index) => {
                const isCredit = tx.type === 'credit' || (tx.amount && tx.amount > 0);
                return (
                  <View 
                    key={tx.id || tx._id || index} 
                    style={[styles.transactionItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={[styles.txIconContainer, { backgroundColor: isCredit ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)' }]}>
                      <Ionicons 
                        name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'} 
                        size={22} 
                        color={isCredit ? '#16A34A' : '#DC2626'} 
                      />
                    </View>
                    <View style={styles.txDetails}>
                      <Text style={[styles.txDesc, { color: colors.foreground }]} numberOfLines={1}>
                        {tx.description || (isCredit ? 'Wallet Top-Up' : 'Storage & Bandwidth Usage')}
                      </Text>
                      <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
                        {formatDate(tx.created_at || tx.date)}
                      </Text>
                    </View>
                    <Text style={[styles.txAmount, { color: isCredit ? '#16A34A' : '#DC2626' }]}>
                      {isCredit ? '+' : '-'}{formatCurrency(Math.abs(tx.amount || 0))}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Select Top-Up Amount</Text>
            <View style={styles.quickAmounts}>
              {['50', '100', '200', '500'].map((amt) => (
                <TouchableOpacity 
                  key={amt} 
                  style={[
                    styles.quickBtn, 
                    { 
                      backgroundColor: topupAmount === amt ? Colors.primary : colors.card,
                      borderColor: topupAmount === amt ? Colors.primary : colors.border
                    }
                  ]} 
                  onPress={() => setTopupAmount(amt)}
                >
                  <Text style={[
                    styles.quickBtnText, 
                    { color: topupAmount === amt ? '#FFFFFF' : colors.foreground }
                  ]}>
                    ₹{amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.foreground }]}>Custom Amount (₹)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                keyboardType="numeric"
                value={topupAmount}
                onChangeText={setTopupAmount}
                placeholder="Enter amount"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: Colors.primary }]} 
              onPress={handleTopUp}
              activeOpacity={0.88}
            >
              <Ionicons name="card-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Proceed to Payment</Text>
            </TouchableOpacity>
            
            <Text style={[styles.infoNote, { color: colors.mutedForeground }]}>
              Secure payments powered by Razorpay checkout
            </Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabText: { fontWeight: '600', fontSize: 14 },
  content: { flex: 1, padding: 16 },
  loader: { marginTop: 40 },
  walletCard: { backgroundColor: '#FF6B00', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  walletBadge: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, backgroundColor: 'rgba(0,0,0,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  walletTitle: { color: '#FFF', fontSize: 13, opacity: 0.9, marginBottom: 4 },
  walletBalance: { color: '#FFF', fontSize: 34, fontWeight: '800', marginBottom: 16 },
  walletTopupBtn: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  walletTopupBtnText: { color: '#FF6B00', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 6 },
  card: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
  cardLabel: { fontSize: 14, fontWeight: '600' },
  cardVal: { fontSize: 14, fontWeight: '700' },
  progressContainer: { height: 8, borderRadius: 4, marginVertical: 12, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#FF6B00', borderRadius: 4 },
  usageText: { textAlign: 'right', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1 },
  gridItemLabel: { fontSize: 12, marginBottom: 4 },
  gridItemValue: { fontSize: 18, fontWeight: '700' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' },
  priceLabel: { fontSize: 13 },
  priceValue: { fontSize: 13, fontWeight: '700' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transactionItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  txIconContainer: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  txDetails: { flex: 1, marginLeft: 12 },
  txDesc: { fontSize: 14, fontWeight: '600' },
  txDate: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySub: { fontSize: 13, textAlign: 'center' },
  quickAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  quickBtn: { flex: 1, paddingVertical: 12, marginHorizontal: 4, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quickBtnText: { fontWeight: '700', fontSize: 14 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { marginBottom: 8, fontWeight: '600', fontSize: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16 },
  primaryBtn: { borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  infoNote: { textAlign: 'center', marginTop: 14, fontSize: 12 },
});
