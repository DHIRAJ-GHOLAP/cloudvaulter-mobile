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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../../context/ThemeContext';
import { filesApi } from '../../lib/api';
import { formatBytes, formatDate, getFileIcon, getFileColor } from '../../lib/utils';
import { Colors } from '../../constants/colors';

interface PathSegment {
  id: string | undefined;
  name: string;
}

export default function FilesScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [path, setPath] = useState<PathSegment[]>([{ id: undefined, name: 'Home' }]);

  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showActionMenu, setShowActionMenu] = useState(false);

  const currentFolderId = path[path.length - 1]?.id;

  const loadFiles = async () => {
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
  };

  useEffect(() => {
    loadFiles();
  }, [currentFolderId]);

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
  }, [currentFolderId]);

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

  const navigateIntoFolder = (folder: any) => {
    setPath([...path, { id: folder.id || folder._id, name: folder.name || folder.filename }]);
    setSelectedItems([]);
  };

  const navigateToBreadcrumb = (index: number) => {
    setPath(path.slice(0, index + 1));
    setSelectedItems([]);
  };

  const filteredFolders = folders.filter((f) =>
    (f.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFiles = files.filter((f) =>
    (f.filename || f.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allItems = [
    ...filteredFolders.map((f) => ({ ...f, isFolder: true })),
    ...filteredFiles.map((f) => ({ ...f, isFolder: false })),
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search & Mode Bar */}
      <View style={styles.topBar}>
        <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search vault..."
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

      {/* Breadcrumbs Navigation */}
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
                <TouchableOpacity
                  onPress={() => navigateToBreadcrumb(index)}
                  disabled={isLast}
                >
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
          <Ionicons name="folder-open-outline" size={60} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>This folder is empty</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Upload documents, photos, or create new folders
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

            return (
              <TouchableOpacity
                style={[
                  viewMode === 'grid' ? styles.gridCard : styles.listCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
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
                  <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>
                    {formatBytes(item.size || 0)} • {formatDate(item.created_at || item.updated_at)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleShareFile(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="share-outline" size={18} color={Colors.primary} />
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
            <Text style={[styles.actionSheetTitle, { color: colors.foreground }]}>Add to Vault</Text>

            <TouchableOpacity style={styles.actionSheetOption} onPress={handlePickDocument}>
              <View style={[styles.actionOptionIcon, { backgroundColor: 'rgba(255, 107, 0, 0.12)' }]}>
                <Ionicons name="document-attach-outline" size={22} color={Colors.primary} />
              </View>
              <View>
                <Text style={[styles.actionOptionTitle, { color: colors.foreground }]}>Upload File</Text>
                <Text style={[styles.actionOptionSub, { color: colors.mutedForeground }]}>
                  PDF, docs, zip, any file type
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionSheetOption} onPress={handlePickImage}>
              <View style={[styles.actionOptionIcon, { backgroundColor: 'rgba(14, 165, 233, 0.12)' }]}>
                <Ionicons name="images-outline" size={22} color="#0EA5E9" />
              </View>
              <View>
                <Text style={[styles.actionOptionTitle, { color: colors.foreground }]}>Photos & Videos</Text>
                <Text style={[styles.actionOptionSub, { color: colors.mutedForeground }]}>
                  Upload media from gallery
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
                  Organize files in folders
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Create Folder Dialog */}
      <Modal
        visible={showCreateFolder}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateFolder(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dialogCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>Create New Folder</Text>
            <TextInput
              style={[styles.dialogInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Folder Name"
              placeholderTextColor={colors.mutedForeground}
              value={newFolderName}
              onChangeText={setNewFolderName}
              autoFocus
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogCancelBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setNewFolderName('');
                  setShowCreateFolder(false);
                }}
              >
                <Text style={[styles.dialogBtnText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dialogCreateBtn, { backgroundColor: Colors.primary }]}
                onPress={handleCreateFolder}
              >
                <Text style={[styles.dialogBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  viewModeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breadcrumbBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 13,
  },
  uploadBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '600',
  },
  uploadPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  gridCard: {
    flex: 0.5,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    margin: 4,
    alignItems: 'flex-start',
  },
  folderIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  actionSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionOptionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  dialogCard: {
    margin: 24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignSelf: 'center',
    width: '85%',
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
  },
  dialogInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    marginBottom: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dialogCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dialogCreateBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  dialogBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
