import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { vaultApi } from '../../lib/api';

export default function EmergencyVaultScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vaultData, setVaultData] = useState<any>(null);

  // PIN Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [emergencyNote, setEmergencyNote] = useState('');
  const [savingPin, setSavingPin] = useState(false);

  // Contact Modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRel, setContactRel] = useState('Family');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const loadData = async () => {
    try {
      const data = await vaultApi.getEmergencyVault();
      setVaultData(data);
    } catch (e: any) {
      console.warn('Failed to load emergency vault', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSavePin = async () => {
    if (pin.length < 4 || pin.length > 6) {
      Alert.alert('Invalid PIN', 'PIN must be 4 to 6 numeric digits');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'PINs do not match');
      return;
    }
    setSavingPin(true);
    try {
      await vaultApi.setupEmergencyVault(pin, emergencyNote);
      Alert.alert('Success', 'Emergency PIN & note saved securely');
      setShowPinModal(false);
      setPin('');
      setConfirmPin('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to set PIN');
    } finally {
      setSavingPin(false);
    }
  };

  const handleAddContact = async () => {
    if (!contactName.trim()) {
      Alert.alert('Required', 'Please enter contact name');
      return;
    }
    setSavingContact(true);
    try {
      await vaultApi.addTrustedContact({
        name: contactName.trim(),
        relationship: contactRel,
        phone: contactPhone.trim() || undefined,
        email: contactEmail.trim() || undefined,
      });
      Alert.alert('Contact Added', `${contactName} added to emergency contacts`);
      setShowContactModal(false);
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add contact');
    } finally {
      setSavingContact(false);
    }
  };

  const handleRemoveContact = (id: string) => {
    Alert.alert('Remove Contact', 'Are you sure you want to remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await vaultApi.removeTrustedContact(id);
            loadData();
          } catch {}
        },
      },
    ]);
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    `https://app.cloudvaulter.space/emergency-access?id=${vaultData?.emergency_id || ''}`
  )}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Emergency Life Vault</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={['#FF6B00']} />
          }
        >
          {/* Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#FFF" />
              <Text style={styles.heroBadgeText}>SIGNATURE SECURITY</Text>
            </View>
            <Text style={styles.heroTitle}>Emergency Recovery ID</Text>
            <Text style={styles.heroSub}>
              Paramedics and doctors can scan your QR card to access vital medical & identity records during emergencies.
            </Text>

            <View style={styles.idBox}>
              <Text style={styles.idLabel}>YOUR VAULT ID</Text>
              <Text style={styles.idValue}>{vaultData?.emergency_id || 'CV-EMG-....'}</Text>
            </View>
          </View>

          {/* QR Code Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Your Emergency QR Card</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Show this QR code or keep a screenshot for instant access
            </Text>

            <View style={styles.qrContainer}>
              <Image source={{ uri: qrUrl }} style={styles.qrImage} />
              <Text style={[styles.qrHelper, { color: colors.foreground }]}>
                Scan with any smartphone camera
              </Text>
              <Text style={[styles.qrUrl, { color: colors.mutedForeground }]}>
                cloudvaulter.space/emergency-access
              </Text>
            </View>
          </View>

          {/* PIN Security Settings */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Emergency PIN</Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                  {vaultData?.is_pin_configured ? '🔒 Protected (Active)' : '⚠️ PIN Not Configured'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowPinModal(true)}
              >
                <Text style={styles.actionBtnText}>
                  {vaultData?.is_pin_configured ? 'Change' : 'Set PIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Trusted Contacts */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Trusted Contacts ({vaultData?.trusted_contacts?.length || 0})
              </Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowContactModal(true)}
              >
                <Ionicons name="add" size={16} color="#FF6B00" />
                <Text style={styles.actionBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {(!vaultData?.trusted_contacts || vaultData.trusted_contacts.length === 0) ? (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No emergency contacts added yet.
              </Text>
            ) : (
              vaultData.trusted_contacts.map((c: any) => (
                <View key={c.id} style={[styles.contactRow, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={[styles.contactName, { color: colors.foreground }]}>{c.name}</Text>
                    <Text style={styles.contactRel}>{c.relationship}</Text>
                    {c.phone && <Text style={[styles.contactDetail, { color: colors.mutedForeground }]}>{c.phone}</Text>}
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveContact(c.id)}>
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Set PIN Modal */}
      <Modal visible={showPinModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Configure Emergency PIN</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Enter a 4-6 digit PIN required to unlock emergency records.
            </Text>

            <TextInput
              placeholder="Enter PIN (4-6 digits)"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              value={pin}
              onChangeText={setPin}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />

            <TextInput
              placeholder="Confirm PIN"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              value={confirmPin}
              onChangeText={setConfirmPin}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />

            <TextInput
              placeholder="Medical notes / special instructions"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              value={emergencyNote}
              onChangeText={setEmergencyNote}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, height: 70 }]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowPinModal(false)}
              >
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSavePin}
                disabled={savingPin}
              >
                <Text style={styles.saveBtnText}>{savingPin ? 'Saving...' : 'Save PIN'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Contact Modal */}
      <Modal visible={showContactModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Emergency Contact</Text>

            <TextInput
              placeholder="Full Name"
              placeholderTextColor={colors.mutedForeground}
              value={contactName}
              onChangeText={setContactName}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />

            <TextInput
              placeholder="Relationship (e.g. Spouse, Father)"
              placeholderTextColor={colors.mutedForeground}
              value={contactRel}
              onChangeText={setContactRel}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />

            <TextInput
              placeholder="Phone Number"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              value={contactPhone}
              onChangeText={setContactPhone}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowContactModal(false)}
              >
                <Text style={{ color: colors.foreground }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddContact}
                disabled={savingContact}
              >
                <Text style={styles.saveBtnText}>{savingContact ? 'Saving...' : 'Add Contact'}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: {
    backgroundColor: '#FF6B00',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  heroBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  heroTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18, marginBottom: 14 },
  idBox: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  idLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  idValue: { color: '#FDE68A', fontSize: 18, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub: { fontSize: 12, marginTop: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,107,0,0.1)',
  },
  actionBtnText: { color: '#FF6B00', fontSize: 13, fontWeight: '700' },
  qrContainer: { alignItems: 'center', paddingVertical: 14 },
  qrImage: { width: 180, height: 180, borderRadius: 12, backgroundColor: '#FFF', padding: 8 },
  qrHelper: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  qrUrl: { fontSize: 11, marginTop: 2 },
  emptyText: { fontSize: 13, textAlign: 'center', marginVertical: 12 },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    marginTop: 8,
  },
  contactName: { fontSize: 14, fontWeight: '700' },
  contactRel: { fontSize: 12, color: '#FF6B00', fontWeight: '600', marginTop: 1 },
  contactDetail: { fontSize: 11, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSub: { fontSize: 12, marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  saveBtn: { backgroundColor: '#FF6B00', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  saveBtnText: { color: '#FFF', fontWeight: '700' },
});
