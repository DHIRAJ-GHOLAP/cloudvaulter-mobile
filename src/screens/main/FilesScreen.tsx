import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../context/ThemeContext';
import { filesApi, vaultApi } from '../../lib/api';
import { formatBytes, formatDate, getFileIcon, getFileColor } from '../../lib/utils';
import { Colors } from '../../constants/colors';

interface PathSegment {
  id: string | undefined;
  name: string;
}

const LIFE_CATEGORIES = [
  { id: 'all', label: 'All Files', icon: 'folder-outline' },
  { id: 'emergency', label: 'Emergency Vault', icon: 'shield-checkmark-outline' },
  { id: 'identity', label: 'Identity & KYC', icon: 'card-outline' },
  { id: 'medical', label: 'Medical & Health', icon: 'medkit-outline' },
  { id: 'academic', label: 'Academic & Degrees', icon: 'school-outline' },
  { id: 'financial', label: 'Financial & Tax', icon: 'cash-outline' },
  { id: 'property', label: 'Property & Legal', icon: 'home-outline' },
  { id: 'vehicle', label: 'Vehicle & Auto', icon: 'car-outline' },
  { id: 'employment', label: 'Career & Work', icon: 'briefcase-outline' },
];

export default function FilesScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState<PathSegment[]>([{ id: undefined, name: 'Home' }]);

  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(false);

  // File Metadata Modal (Life Vault Tagging)
  const [editingFile, setEditingFile] = useState<any>(null);
  const [editCategory, setEditCategory] = useState('identity');
  const [editIsEmergency, setEditIsEmergency] = useState(false);
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [savingMetadata, setSavingMetadata] = useState(false);

  const currentFolderId = path[path.length - 1]?.id;

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await filesApi.list(currentFolderId);
      setFiles(data.files || []);
      setFolders(data.folders || []);
    } catch (error: any) {
      console.warn('Error loading files', error);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (route.params?.openUpload) {
      handlePickDocument();
      navigation.setParams({ openUpload: null });
    }
  }, [route.params]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFiles();
    setRefreshing(false);
  }, [loadFiles]);

  const handlePickDocument = async () => {
    setShowActionMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: '*/*',
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadPickedFile(asset.uri, asset.name, asset.mimeType || 'application/octet-stream');
      }
    } catch (err) {
      console.warn('Document picker error', err);
    }
  };

  const handlePickImage = async () => {
    setShowActionMenu(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.fileName || `photo_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
        const mimeType = asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');
        await uploadPickedFile(asset.uri, filename, mimeType);
      }
    } catch (err) {
      console.warn('Image picker error', err);
    }
  };

  const uploadPickedFile = async (uri: string, name: string, type: string) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      await filesApi.upload(uri, name, type, currentFolderId, (prog) => {
        setUploadProgress(prog);
      });
      await loadFiles();
      Toast.show({
        type: 'success',
        text1: 'Upload Complete',
        text2: `${name} safely encrypted & stored`,
      });
    } catch (error: any) {
      Alert.alert('Upload Failed', error?.message || 'Could not upload file.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await filesApi.createFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName('');
      setShowCreateFolder(false);
      await loadFiles();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not create folder.');
    }
  };

  const handleDeleteItem = async (id: string, isFolder: boolean) => {
    Alert.alert(
      'Delete Confirmation',
      `Are you sure you want to delete this ${isFolder ? 'folder' : 'file'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isFolder) {
                await filesApi.deleteFolder(id);
              } else {
                await filesApi.delete(id);
              }
              await loadFiles();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Delete failed.');
            }
          },
        },
      ]
    );
  };

  const handleShareFile = async (file: any) => {
    try {
      const res = await filesApi.getSignedUrl(file.id || file._id, 'download');
      if (res?.url) {
        if (await Sharing.isAvailableAsync()) {
          const cacheDir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
          const localPath = `${cacheDir}${file.filename || file.name || 'download'}`;
          const downloadRes = await FileSystem.downloadAsync(res.url, localPath);
          await Sharing.shareAsync(downloadRes.uri);
        } else {
          Alert.alert('Share Link', res.url);
        }
      }
    } catch (err: any) {
      Alert.alert('Share Failed', err?.message || 'Could not generate share link.');
    }
  };

  const openMetadataModal = (file: any) => {
    setEditingFile(file);
    setEditCategory(file.category || 'identity');
    setEditIsEmergency(!!file.is_emergency);
    setEditExpiryDate(file.expiry_date ? file.expiry_date.split('T')[0] : '');
  };

  const handleSaveMetadata = async () => {
    if (!editingFile) return;
    setSavingMetadata(true);
    const fileId = editingFile.id || editingFile._id;
    try {
      await vaultApi.updateMetadata(fileId, {
        category: editCategory,
        is_emergency: editIsEmergency,
        expiry_date: editExpiryDate.trim() ? editExpiryDate.trim() : null,
      });
      setEditingFile(null);
      await loadFiles();
      Toast.show({
        type: 'success',
        text1: 'Vault Record Updated',
        text2: `${editingFile.filename || editingFile.name} categorized as ${editCategory}`,
      });
    } catch (err: any) {
      Alert.alert('Update Error', err?.response?.data?.detail || err?.message || 'Failed to update file metadata');
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleQuickToggleEmergency = async (file: any) => {
    const fileId = file.id || file._id;
    const newStatus = !file.is_emergency;
    try {
      await vaultApi.updateMetadata(fileId, {
        is_emergency: newStatus,
        category: newStatus ? 'emergency' : (file.category || 'general'),
      });
      await loadFiles();
      Toast.show({
        type: 'success',
        text1: newStatus ? 'Added to Emergency Vault' : 'Removed from Emergency Vault',
        text2: file.filename || file.name,
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update emergency status');
    }
  };

  const navigateIntoFolder = (folder: any) => {
    setPath([...path, { id: folder.id || folder._id, name: folder.name || folder.filename }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    setPath(path.slice(0, index + 1));
  };

  // ─── FILTERING ─────────────────────────────────────────────────────────────
  const filteredFolders = folders.filter((f) =>
    (f.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter((f) => {
    const matchesSearch = (f.filename || f.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'emergency') return f.is_emergency || f.category === 'emergency';
    return f.category === selectedCategory;
  });

  const allItems = [
    ...(selectedCategory === 'all' ? filteredFolders.map((f) => ({ ...f, isFolder: true })) : []),
    ...filteredFiles.map((f) => ({ ...f, isFolder: false })),
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Search & Mode Bar */}
      <View style={styles.topBar}>
        <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search documents & metadata..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.viewModeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
        >
          <Ionicons
            name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
            size={20}
            color={colors.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Life Vault Category Filter Pills */}
      <View style={styles.categoryBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {LIFE_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: active ? Colors.primary : colors.card,
                    borderColor: active ? Colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={14}
                  color={active ? '#FFFFFF' : colors.mutedForeground}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    { color: active ? '#FFFFFF' : colors.foreground },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Breadcrumbs Navigation */}
      {selectedCategory === 'all' && (
        <View style={styles.breadcrumbBar}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={path}
            keyExtractor={(_, idx) => idx.toString()}
            renderItem={({ item, index }) => {
              const isLast = index === path.length - 1;
              return (
                <View style={styles.breadcrumbItem}>
                  <TouchableOpacity onPress={() => navigateToBreadcrumb(index)} disabled={isLast}>
                    <Text
                      style={[
                        styles.breadcrumbText,
                        { color: isLast ? Colors.primary : colors.mutedForeground, fontWeight: isLast ? '700' : '500' },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                  {!isLast && (
                    <Ionicons name="chevron-forward" size={14} color={colors.mutedForeground} style={{ marginHorizontal: 4 }} />
                  )}
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Upload Progress Bar */}
      {uploading && (
        <View style={[styles.uploadBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={[styles.uploadText, { color: colors.foreground }]}>Uploading file...</Text>
            <Text style={[styles.uploadPercent, { color: Colors.primary }]}>{uploadProgress}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Files List / Grid */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : allItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="folder-open-outline" size={54} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {selectedCategory === 'all' ? 'This folder is empty' : `No files in ${selectedCategory}`}
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Upload documents or tag existing files to this Life Vault category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={allItems}
          key={viewMode}
          numColumns={viewMode === 'grid' ? 2 : 1}
          keyExtractor={(item) => item.id || item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          renderItem={({ item }) => {
            if (item.isFolder) {
              return (
                <TouchableOpacity
                  style={[
                    viewMode === 'grid' ? styles.gridCard : styles.listCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => navigateIntoFolder(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.folderIconWrapper, { backgroundColor: 'rgba(255, 107, 0, 0.12)' }]}>
                    <Ionicons name="folder" size={24} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name || 'Folder'}
                    </Text>
                    <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>
                      {formatDate(item.created_at || item.updated_at)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item.id || item._id, true)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }

            const iconName = getFileIcon(item.content_type || item.type || '');
            const iconColor = getFileColor(item.content_type || item.type || '');
            const isEmg = item.is_emergency || item.category === 'emergency';

            return (
              <TouchableOpacity
                style={[
                  viewMode === 'grid' ? styles.gridCard : styles.listCard,
                  { backgroundColor: colors.card, borderColor: isEmg ? '#FF6B00' : colors.border },
                ]}
                onPress={() => navigation.navigate('FilePreview', { file: item })}
                activeOpacity={0.7}
              >
                <View style={[styles.fileIconWrapper, { backgroundColor: `${iconColor}18` }]}>
                  <Ionicons name={iconName as any} size={24} color={iconColor} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {item.filename || item.name || 'Untitled'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    {isEmg && (
                      <View style={styles.emergencyPill}>
                        <Text style={styles.emergencyPillText}>EMERGENCY</Text>
                      </View>
                    )}
                    {item.category && item.category !== 'general' && (
                      <View style={[styles.categoryBadge, { backgroundColor: colors.background }]}>
                        <Text style={[styles.categoryBadgeText, { color: colors.mutedForeground }]}>
                          {item.category.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>
                      {formatBytes(item.size || 0)}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => openMetadataModal(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleQuickToggleEmergency(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name={isEmg ? 'shield-checkmark' : 'shield-outline'}
                      size={18}
                      color={isEmg ? '#FF6B00' : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleShareFile(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="share-outline" size={18} color={colors.foreground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteItem(item.id || item._id, false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowActionMenu(true)}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Action Menu Modal */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={[styles.actionSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.actionSheetTitle, { color: colors.foreground }]}>Add to Life Vault</Text>

            <TouchableOpacity style={styles.actionSheetOption} onPress={handlePickDocument}>
              <View style={[styles.actionOptionIcon, { backgroundColor: 'rgba(255, 107, 0, 0.12)' }]}>
                <Ionicons name="document-attach-outline" size={22} color={Colors.primary} />
              </View>
              <View>
                <Text style={[styles.actionOptionTitle, { color: colors.foreground }]}>Upload File</Text>
                <Text style={[styles.actionOptionSub, { color: colors.mutedForeground }]}>
                  PDF, docs, medical reports, ID cards
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionSheetOption} onPress={handlePickImage}>
              <View style={[styles.actionOptionIcon, { backgroundColor: 'rgba(14, 165, 233, 0.12)' }]}>
                <Ionicons name="images-outline" size={22} color="#0EA5E9" />
              </View>
              <View>
                <Text style={[styles.actionOptionTitle, { color: colors.foreground }]}>Photos & Scan</Text>
                <Text style={[styles.actionOptionSub, { color: colors.mutedForeground }]}>
                  Upload photos from camera or gallery
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={() => {
                setShowActionMenu(false);
                setShowCreateFolder(true);
              }}
            >
              <View style={[styles.actionOptionIcon, { backgroundColor: 'rgba(22, 163, 74, 0.12)' }]}>
                <Ionicons name="folder-outline" size={22} color="#16A34A" />
              </View>
              <View>
                <Text style={[styles.actionOptionTitle, { color: colors.foreground }]}>New Folder</Text>
                <Text style={[styles.actionOptionSub, { color: colors.mutedForeground }]}>
                  Create an organized folder
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── MODAL: EDIT LIFE VAULT METADATA & CATEGORY ───────────────────────── */}
      <Modal visible={!!editingFile} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalHeading, { color: colors.foreground }]}>Organize in Life Vault</Text>
            <Text style={[styles.modalFileTitle, { color: colors.mutedForeground }]} numberOfLines={1}>
              {editingFile?.filename || editingFile?.name}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.foreground, marginTop: 10 }]}>Category</Text>
            <View style={styles.categoryWrap}>
              {[
                { id: 'identity', label: 'Identity' },
                { id: 'medical', label: 'Medical' },
                { id: 'academic', label: 'Academic' },
                { id: 'financial', label: 'Financial' },
                { id: 'property', label: 'Property' },
                { id: 'vehicle', label: 'Vehicle' },
                { id: 'employment', label: 'Career' },
                { id: 'general', label: 'General' },
              ].map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.catSelectBtn,
                    {
                      backgroundColor: editCategory === c.id ? Colors.primary : colors.background,
                      borderColor: editCategory === c.id ? Colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setEditCategory(c.id)}
                >
                  <Text
                    style={[
                      styles.catSelectBtnText,
                      { color: editCategory === c.id ? '#FFF' : colors.foreground },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.emergencyToggleRow, { borderColor: editIsEmergency ? '#FF6B00' : colors.border }]}
              onPress={() => setEditIsEmergency(!editIsEmergency)}
            >
              <Ionicons
                name={editIsEmergency ? 'shield-checkmark' : 'shield-outline'}
                size={22}
                color={editIsEmergency ? '#FF6B00' : colors.mutedForeground}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.emergencyToggleTitle, { color: colors.foreground }]}>
                  Emergency Quick-Access Record
                </Text>
                <Text style={[styles.emergencyToggleSub, { color: colors.mutedForeground }]}>
                  Unlocked when first responders scan your emergency QR card
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { color: colors.foreground, marginTop: 12 }]}>
              Document Expiry Date (YYYY-MM-DD)
            </Text>
            <TextInput
              placeholder="e.g. 2028-12-31"
              placeholderTextColor={colors.mutedForeground}
              value={editExpiryDate}
              onChangeText={setEditExpiryDate}
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingFile(null)}>
                <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: Colors.primary }]}
                onPress={handleSaveMetadata}
                disabled={savingMetadata}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                  {savingMetadata ? 'Saving...' : 'Save Tags'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Folder Modal */}
      <Modal visible={showCreateFolder} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalHeading, { color: colors.foreground }]}>New Folder</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Folder Name"
              placeholderTextColor={colors.mutedForeground}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateFolder(false)}>
                <Text style={{ color: colors.mutedForeground, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: Colors.primary }]} onPress={handleCreateFolder}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Create</Text>
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
  topBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', gap: 10 },
  searchWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14 },
  viewModeBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  categoryBarWrapper: { paddingVertical: 4 },
  categoryScroll: { paddingHorizontal: 16, gap: 8 },
  categoryPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  categoryPillText: { fontSize: 12, fontWeight: '700' },
  breadcrumbBar: { paddingHorizontal: 16, paddingVertical: 6 },
  breadcrumbItem: { flexDirection: 'row', alignItems: 'center' },
  breadcrumbText: { fontSize: 13 },
  uploadBanner: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  uploadText: { fontSize: 12, fontWeight: '600' },
  uploadPercent: { fontSize: 12, fontWeight: '700' },
  progressBarTrack: { height: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FF6B00' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySub: { fontSize: 12, textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 90 },
  listCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  gridCard: { flex: 1, margin: 4, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  folderIconWrapper: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fileIconWrapper: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 11 },
  emergencyPill: { backgroundColor: 'rgba(255, 107, 0, 0.18)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  emergencyPillText: { color: '#FF6B00', fontSize: 9, fontWeight: '800' },
  categoryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  categoryBadgeText: { fontSize: 9, fontWeight: '700' },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF6B00', alignItems: 'center', justifyContent: 'center', shadowColor: '#FF6B00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalBox: { borderRadius: 16, padding: 20, borderWidth: 1 },
  modalHeading: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalFileTitle: { fontSize: 12, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catSelectBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  catSelectBtnText: { fontSize: 11, fontWeight: '700' },
  emergencyToggleRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, marginVertical: 8 },
  emergencyToggleTitle: { fontSize: 13, fontWeight: '700' },
  emergencyToggleSub: { fontSize: 10, marginTop: 1 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  confirmBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  actionSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, position: 'absolute', bottom: 0, left: 0, right: 0 },
  actionSheetTitle: { fontSize: 17, fontWeight: '800', marginBottom: 16 },
  actionSheetOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  actionOptionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  actionOptionTitle: { fontSize: 15, fontWeight: '700' },
  actionOptionSub: { fontSize: 12 },
});
