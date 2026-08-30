import React, { useState, useEffect, useCallback } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../context/ThemeContext';
import { vaultApi, filesApi } from '../../lib/api';
import { Colors } from '../../constants/colors';
import { formatBytes, formatDate } from '../../lib/utils';

export default function EmergencyVaultScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'records' | 'contacts' | 'expiries'>('qr');

  // Vault data
  const [vaultData, setVaultData] = useState<any>(null);
  const [emergencyFiles, setEmergencyFiles] = useState<any[]>([]);
  const [expiries, setExpiries] = useState<any[]>([]);

  // PIN Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [emergencyNote, setEmergencyNote] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [savingPin, setSavingPin] = useState(false);

  // Contact Modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRel, setContactRel] = useState('Family');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [vaultRes, expiriesRes, allFilesRes] = await Promise.allSettled([
        vaultApi.getEmergencyVault(),
        vaultApi.getExpiries(),
        filesApi.list(),
      ]);

      if (vaultRes.status === 'fulfilled') {
        setVaultData(vaultRes.value);
        if (vaultRes.value?.emergency_note) {
          setEmergencyNote(vaultRes.value.emergency_note);
        }
      }

      if (expiriesRes.status === 'fulfilled') {
        const raw = expiriesRes.value;
        setExpiries(Array.isArray(raw) ? raw : raw?.expiries || []);
      }

      if (allFilesRes.status === 'fulfilled') {
        const fileList = allFilesRes.value?.files || [];
        const emg = fileList.filter((f: any) => f.is_emergency || f.category === 'emergency');
        setEmergencyFiles(emg);
      }
    } catch (e: any) {
      console.warn('Failed to load emergency vault', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Toast.show({
      type: 'success',
      text1: 'Copied!',
      text2: label,
      position: 'bottom',
    });
  };

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
      const combinedNote = emergencyNote.trim() ? `[Blood: ${bloodGroup}] ${emergencyNote.trim()}` : `[Blood: ${bloodGroup}]`;
      await vaultApi.setupEmergencyVault(pin, combinedNote);
      Alert.alert('Success', 'Emergency PIN and medical instructions saved.');
      setShowPinModal(false);
      setPin('');
      setConfirmPin('');
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || err?.message || 'Failed to set PIN');
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
      setShowContactModal(false);
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      await loadData();
      Toast.show({
        type: 'success',
        text1: 'Contact Added',
        text2: `${contactName} is now in emergency contacts`,
      });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || err?.message || 'Failed to add contact');
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
            await loadData();
          } catch {}
        },
      },
    ]);
  };

  const handleShareLink = async () => {
    const accessUrl = `https://app.cloudvaulter.space/emergency-access?id=${vaultData?.emergency_id || ''}`;
    try {
      await Sharing.shareAsync(accessUrl, { dialogTitle: 'CloudVaulter Emergency Access Card' });
    } catch {
      await copyToClipboard(accessUrl, 'Emergency Access Link copied');
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
    `https://app.cloudvaulter.space/emergency-access?id=${vaultData?.emergency_id || ''}`
  )}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Emergency Life Vault</Text>
        <TouchableOpacity onPress={handleShareLink} style={styles.shareBtn}>
          <Ionicons name="share-social-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Sub-Nav Segment Tabs */}
      <View style={[styles.tabBarWrapper, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { id: 'qr', label: 'QR Card', icon: 'qr-code' },
            { id: 'records', label: `Records (${emergencyFiles.length})`, icon: 'document-text' },
            { id: 'contacts', label: `Contacts (${vaultData?.trusted_contacts?.length || 0})`, icon: 'people' },
            { id: 'expiries', label: `Expiries (${expiries.length})`, icon: 'time' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                activeTab === tab.id && { borderBottomColor: Colors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(tab.id as any)}
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

      {loading && !refreshing ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {/* ─── TAB 1: QR CARD & EMERGENCY ID ─────────────────────────────────── */}
          {activeTab === 'qr' && (
            <View>
              {/* Hero Banner */}
              <View style={styles.heroCard}>
                <View style={styles.heroBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#FFF" />
                  <Text style={styles.heroBadgeText}>PARAMEDIC QUICK-ACCESS</Text>
                </View>
                <Text style={styles.heroTitle}>Emergency Recovery ID</Text>
                <Text style={styles.heroSub}>
                  In medical emergencies or accidents, doctors and first responders can scan your QR code to unlock your vital medical records, allergies, and blood group.
                </Text>

                <TouchableOpacity
                  style={styles.idBox}
                  onPress={() => copyToClipboard(vaultData?.emergency_id || '', 'Emergency ID copied')}
                >
                  <Text style={styles.idLabel}>YOUR VAULT EMERGENCY ID</Text>
                  <Text style={styles.idValue}>{vaultData?.emergency_id || 'CV-EMG-SYNCING'}</Text>
                  <Text style={styles.idTapHint}>Tap to copy ID</Text>
                </TouchableOpacity>
              </View>

              {/* QR Code Card */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>Your Emergency QR Card</Text>
                  <TouchableOpacity onPress={handleShareLink}>
                    <Ionicons name="share-outline" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                  Keep a screenshot in your wallet or on your phone lock screen
                </Text>

                <View style={styles.qrContainer}>
                  <Image source={{ uri: qrUrl }} style={styles.qrImage} />
                  <Text style={[styles.qrHelper, { color: colors.foreground }]}>
                    Scan with any smartphone camera
                  </Text>
                  <Text style={[styles.qrUrl, { color: colors.mutedForeground }]}>
                    app.cloudvaulter.space/emergency-access
                  </Text>
                </View>
              </View>

              {/* PIN & Medical Note Settings Card */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.cardTitle, { color: colors.foreground }]}>Emergency PIN & Vitals</Text>
                    <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                      {vaultData?.is_pin_configured ? 'Protected with 4-6 digit numeric PIN' : 'No PIN configured yet'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'rgba(255,107,0,0.12)' }]}
                    onPress={() => setShowPinModal(true)}
                  >
                    <Text style={[styles.actionBtnText, { color: Colors.primary }]}>
                      {vaultData?.is_pin_configured ? 'Edit PIN' : 'Set PIN'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {vaultData?.emergency_note ? (
                  <View style={[styles.notesBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.notesLabel, { color: colors.mutedForeground }]}>MEDICAL INSTRUCTIONS</Text>
                    <Text style={[styles.notesText, { color: colors.foreground }]}>{vaultData.emergency_note}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          )}

          {/* ─── TAB 2: EMERGENCY RECORDS ───────────────────────────────────────── */}
          {activeTab === 'records' && (
            <View>
              <Text style={[styles.sectionHeading, { color: colors.foreground }]}>
                Emergency Attached Records
              </Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                Files tagged here are immediately accessible upon scanning your QR card.
              </Text>

              {emergencyFiles.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="document-lock-outline" size={48} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Emergency Records</Text>
                  <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                    Mark vital documents (ID card, health insurance, blood group card) as Emergency Records in the Files tab.
                  </Text>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: Colors.primary }]}
                    onPress={() => navigation.navigate('Files')}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Browse Files to Tag</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                emergencyFiles.map((f) => (
                  <TouchableOpacity
                    key={f.id || f._id}
                    style={[styles.recordCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => navigation.navigate('FilePreview', { file: f })}
                  >
                    <View style={[styles.recordIconWrap, { backgroundColor: 'rgba(255,107,0,0.15)' }]}>
                      <Ionicons name="shield-checkmark" size={22} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.recordName, { color: colors.foreground }]} numberOfLines={1}>
                        {f.name || f.filename}
                      </Text>
                      <Text style={[styles.recordSub, { color: colors.mutedForeground }]}>
                        {formatBytes(f.size || 0)} • {formatDate(f.created_at)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* ─── TAB 3: TRUSTED CONTACTS ────────────────────────────────────────── */}
          {activeTab === 'contacts' && (
            <View>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={[styles.sectionHeading, { color: colors.foreground }]}>Trusted Contacts</Text>
                  <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                    First responders can call these contacts during emergencies.
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                  onPress={() => setShowContactModal(true)}
                >
                  <Ionicons name="add" size={16} color="#FFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Add</Text>
                </TouchableOpacity>
              </View>

              {(!vaultData?.trusted_contacts || vaultData.trusted_contacts.length === 0) ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="people-outline" size={48} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Contacts Added</Text>
                  <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                    Add family members, guardians, or primary physicians who should be notified in an emergency.
                  </Text>
                </View>
              ) : (
                vaultData.trusted_contacts.map((c: any) => (
                  <View
                    key={c.id}
                    style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={[styles.contactAvatar, { backgroundColor: 'rgba(255,107,0,0.12)' }]}>
                      <Ionicons name="person" size={20} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.contactName, { color: colors.foreground }]}>{c.name}</Text>
                      <Text style={[styles.contactRel, { color: Colors.primary }]}>{c.relationship}</Text>
                      {c.phone ? (
                        <Text style={[styles.contactDetail, { color: colors.mutedForeground }]}>{c.phone}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveContact(c.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ─── TAB 4: EXPIRIES & RENEWALS ──────────────────────────────────────── */}
          {activeTab === 'expiries' && (
            <View>
              <Text style={[styles.sectionHeading, { color: colors.foreground }]}>
                Document Expiry Tracker
              </Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>
                Track renewal deadlines for Passports, Visas, Driving Licenses, and Insurance policies.
              </Text>

              {expiries.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="calendar-outline" size={48} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
                  <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Expiry Deadlines</Text>
                  <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                    When uploading identity documents or policies in Files, set an expiry date to receive proactive renewal reminders.
                  </Text>
                </View>
              ) : (
                expiries.map((item: any) => (
                  <View
                    key={item.id || item._id}
                    style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.filename || item.name}</Text>
                        <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                          Category: {item.category || 'Identity'}
                        </Text>
                      </View>
                      <View style={[styles.miniBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                        <Text style={[styles.miniBadgeText, { color: '#DC2626' }]}>
                          Expires: {formatDate(item.expiry_date)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ─── MODAL: CONFIGURE PIN & VITALS ────────────────────────────────────── */}
      <Modal visible={showPinModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalHeading, { color: colors.foreground }]}>Emergency PIN & Vitals</Text>

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Blood Group</Text>
            <View style={styles.bloodRow}>
              {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[
                    styles.bloodChip,
                    {
                      backgroundColor: bloodGroup === bg ? Colors.primary : colors.background,
                      borderColor: bloodGroup === bg ? Colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setBloodGroup(bg)}
                >
                  <Text
                    style={[
                      styles.bloodChipText,
                      { color: bloodGroup === bg ? '#FFF' : colors.foreground },
                    ]}
                  >
                    {bg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Set 4-6 Digit PIN</Text>
            <TextInput
              placeholder="e.g. 1234"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              value={pin}
              onChangeText={setPin}
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Confirm PIN</Text>
            <TextInput
              placeholder="Confirm 4-6 Digit PIN"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              value={confirmPin}
              onChangeText={setConfirmPin}
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Medical Allergies / Instructions</Text>
            <TextInput
              placeholder="e.g. Penicillin allergy, Diabetic, Contact Spouse first"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={2}
              value={emergencyNote}
              onChangeText={setEmergencyNote}
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, height: 60 }]}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPinModal(false)}>
                <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: Colors.primary }]}
                onPress={handleSavePin}
                disabled={savingPin}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  {savingPin ? 'Saving...' : 'Save Configuration'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: ADD CONTACT ──────────────────────────────────────────────── */}
      <Modal visible={showContactModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalHeading, { color: colors.foreground }]}>Add Emergency Contact</Text>

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Full Name</Text>
            <TextInput
              placeholder="e.g. Dr. Rajesh Sharma / Priya"
              placeholderTextColor={colors.mutedForeground}
              value={contactName}
              onChangeText={setContactName}
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Relationship</Text>
            <TextInput
              placeholder="e.g. Spouse, Physician, Parent"
              placeholderTextColor={colors.mutedForeground}
              value={contactRel}
              onChangeText={setContactRel}
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>Phone Number</Text>
            <TextInput
              placeholder="+91 9876543210"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
              value={contactPhone}
              onChangeText={setContactPhone}
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowContactModal(false)}>
                <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: Colors.primary }]}
                onPress={handleAddContact}
                disabled={savingContact}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  {savingContact ? 'Saving...' : 'Add Contact'}
                </Text>
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
  shareBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  tabBarWrapper: { borderBottomWidth: 1 },
  tabScroll: { paddingHorizontal: 12 },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  tabItemText: { fontWeight: '700', fontSize: 13 },
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
  heroSub: { color: 'rgba(255,255,255,0.92)', fontSize: 12, lineHeight: 18, marginBottom: 14 },
  idBox: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  idLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  idValue: { color: '#FDE68A', fontSize: 17, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
  idTapHint: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 4 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
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
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  qrContainer: { alignItems: 'center', paddingVertical: 14 },
  qrImage: { width: 180, height: 180, borderRadius: 12, backgroundColor: '#FFF', padding: 8 },
  qrHelper: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  qrUrl: { fontSize: 11, marginTop: 2 },
  notesBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 12 },
  notesLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  notesText: { fontSize: 13, lineHeight: 18 },
  sectionHeading: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  sectionSub: { fontSize: 12, marginBottom: 16 },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  smallBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, marginTop: 14 },
  recordCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  recordIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  recordName: { fontSize: 14, fontWeight: '700' },
  recordSub: { fontSize: 11, marginTop: 2 },
  contactCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  contactAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  contactName: { fontSize: 14, fontWeight: '700' },
  contactRel: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  contactDetail: { fontSize: 11, marginTop: 2 },
  itemCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  miniBadgeText: { fontSize: 11, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 16, padding: 20, borderWidth: 1 },
  modalHeading: { fontSize: 18, fontWeight: '800', marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  bloodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  bloodChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  bloodChipText: { fontSize: 12, fontWeight: '700' },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  confirmBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
});
