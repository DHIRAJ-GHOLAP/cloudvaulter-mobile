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
import { Colors } from '../../constants/colors';

const API_BASE_URL = 'https://api.cloudvaulter.space/api/v1';

export default function BillingScreen() {
  const { colors, isDark } = useTheme();
  const { token } = useAuth();
  
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
      const headers = { Authorization: `Bearer ${token}` };
      
      const [balanceRes, usageRes, pricingRes] = await Promise.all([
        fetch(`${API_BASE_URL}/wallet/balance`, { headers }),
        fetch(`${API_BASE_URL}/usage/current`, { headers }),
        fetch(`${API_BASE_URL}/pricing/config`, { headers })
      ]);
      
      if (balanceRes.ok) setBalance((await balanceRes.json()).balance || 0);
      if (usageRes.ok) setUsage(await usageRes.json());
      if (pricingRes.ok) setPricing(await pricingRes.json());
      
    } catch (error) {
      console.error('Error fetching billing data:', error);
      Alert.alert('Error', 'Failed to load billing information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/wallet/transactions?skip=0&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'overview') fetchData();
    if (activeTab === 'transactions') fetchTransactions();
  }, [activeTab, fetchData, fetchTransactions]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'overview') fetchData();
    if (activeTab === 'transactions') fetchTransactions();
    else setRefreshing(false);
  };

  const handleTopUp = async () => {
    if (!topupAmount || isNaN(Number(topupAmount)) || Number(topupAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to top up.');
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/payments/create-order`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ amount: Number(topupAmount) })
      });
      
      if (response.ok) {
        Alert.alert('Order Created', `Order for ₹${topupAmount} created successfully. Integration with Razorpay will proceed from here.`);
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate top up');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
    tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
    activeTab: { borderBottomWidth: 2, borderBottomColor: '#FF6B00' },
    tabText: { color: colors.muted, fontWeight: '600' },
    activeTabText: { color: '#FF6B00' },
    content: { flex: 1, padding: 16 },
    walletCard: { backgroundColor: '#FF6B00', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 20 },
    walletTitle: { color: '#FFF', fontSize: 16, opacity: 0.9, marginBottom: 8 },
    walletBalance: { color: '#FFF', fontSize: 36, fontWeight: 'bold' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.foreground, marginBottom: 12, marginTop: 10 },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    progressContainer: { height: 8, backgroundColor: colors.border, borderRadius: 4, marginVertical: 12 },
    progressBar: { height: '100%', backgroundColor: '#FF6B00', borderRadius: 4 },
    usageText: { color: colors.foreground, textAlign: 'right', fontSize: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { width: '48%', backgroundColor: colors.card, padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    gridItemLabel: { color: colors.muted, fontSize: 12, marginBottom: 4 },
    gridItemValue: { color: colors.foreground, fontSize: 16, fontWeight: 'bold' },
    transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    txIconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
    txDetails: { flex: 1, marginLeft: 12 },
    txDesc: { color: colors.foreground, fontSize: 16, fontWeight: '500' },
    txDate: { color: colors.muted, fontSize: 12, marginTop: 4 },
    txAmount: { fontSize: 16, fontWeight: 'bold' },
    txCredit: { color: '#4CAF50' },
    txDebit: { color: '#F44336' },
    emptyText: { color: colors.muted, textAlign: 'center', marginTop: 40 },
    quickAmounts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    quickBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#FF6B00' },
    quickBtnText: { color: '#FF6B00', fontWeight: '600' },
    inputContainer: { marginBottom: 24 },
    inputLabel: { color: colors.foreground, marginBottom: 8, fontWeight: '500' },
    input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 16, color: colors.foreground, fontSize: 18 },
    primaryBtn: { backgroundColor: '#FF6B00', borderRadius: 8, padding: 16, alignItems: 'center' },
    primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    infoNote: { color: colors.muted, textAlign: 'center', marginTop: 16, fontSize: 12 },
    loader: { marginTop: 40 }
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabs}>
        {(['overview', 'transactions', 'topup'] as const).map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]} 
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6B00" />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#FF6B00" style={styles.loader} />
        ) : activeTab === 'overview' ? (
          <View>
            <View style={styles.walletCard}>
              <Text style={styles.walletTitle}>Available Balance</Text>
              <Text style={styles.walletBalance}>₹{balance.toFixed(2)}</Text>
            </View>

            <Text style={styles.sectionTitle}>Current Usage</Text>
            <View style={styles.card}>
              <Text style={{ color: colors.foreground, fontWeight: '500' }}>Storage</Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${Math.min(((usage?.storage || 0) / (usage?.storageLimit || 1)) * 100, 100)}%` }]} />
              </View>
              <Text style={styles.usageText}>
                {((usage?.storage || 0) / (1024*1024*1024)).toFixed(2)} GB / {((usage?.storageLimit || 10) / (1024*1024*1024)).toFixed(2)} GB used
              </Text>
            </View>

            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.gridItemLabel}>API Calls Used</Text>
                <Text style={styles.gridItemValue}>{usage?.apiCalls || 0}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridItemLabel}>Bandwidth Used</Text>
                <Text style={styles.gridItemValue}>{((usage?.bandwidth || 0) / (1024*1024)).toFixed(2)} MB</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridItemLabel}>Files Stored</Text>
                <Text style={styles.gridItemValue}>{usage?.filesCount || 0}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.gridItemLabel}>API Calls Remaining</Text>
                <Text style={styles.gridItemValue}>{Math.max((usage?.apiLimit || 0) - (usage?.apiCalls || 0), 0)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Pricing Structure</Text>
            <View style={styles.card}>
              <Text style={{ color: colors.foreground, marginBottom: 8 }}>Storage: ₹{pricing?.storagePerGb || 0} / GB</Text>
              <Text style={{ color: colors.foreground, marginBottom: 8 }}>Bandwidth: ₹{pricing?.bandwidthPerGb || 0} / GB</Text>
              <Text style={{ color: colors.foreground }}>API: ₹{pricing?.apiPer10k || 0} / 10k calls</Text>
            </View>
          </View>
        ) : activeTab === 'transactions' ? (
          <View>
            {transactions.length === 0 ? (
              <Text style={styles.emptyText}>No transactions found</Text>
            ) : (
              transactions.map((tx, index) => (
                <View key={index} style={styles.transactionItem}>
                  <View style={styles.txIconContainer}>
                    <Ionicons 
                      name={tx.type === 'credit' ? 'arrow-up' : 'arrow-down'} 
                      size={20} 
                      color={tx.type === 'credit' ? '#4CAF50' : '#F44336'} 
                    />
                  </View>
                  <View style={styles.txDetails}>
                    <Text style={styles.txDesc}>{tx.description}</Text>
                    <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[styles.txAmount, tx.type === 'credit' ? styles.txCredit : styles.txDebit]}>
                    {tx.type === 'credit' ? '+' : '-'}₹{Math.abs(tx.amount).toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Quick Amount</Text>
            <View style={styles.quickAmounts}>
              {['50', '100', '200', '500'].map(amt => (
                <TouchableOpacity key={amt} style={styles.quickBtn} onPress={() => setTopupAmount(amt)}>
                  <Text style={styles.quickBtnText}>₹{amt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Custom Amount (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={topupAmount}
                onChangeText={setTopupAmount}
                placeholder="Enter amount"
                placeholderTextColor={colors.muted}
              />
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleTopUp}>
              <Text style={styles.primaryBtnText}>Proceed to Payment</Text>
            </TouchableOpacity>
            
            <Text style={styles.infoNote}>Payment powered by Razorpay</Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
