import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../../context/ThemeContext';
import { filesApi } from '../../lib/api';
import { formatBytes, formatDate, getFileIcon, getFileColor } from '../../lib/utils';
import { Colors } from '../../constants/colors';

export default function FilePreviewScreen() {
  const { colors, isDark } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const file = route.params?.file || {
    filename: 'Unknown File',
    size: 0,
    content_type: 'application/octet-stream',
    created_at: new Date().toISOString(),
  };

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fileId = file.id || file._id;
  const fileName = file.filename || file.name || 'File';
  const contentType = file.content_type || file.type || '';
  const isImage = contentType.startsWith('image/');
  const isVideo = contentType.startsWith('video/');
  const isPdf = contentType.includes('pdf');

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!fileId) {
        setLoadingUrl(false);
        return;
      }
      try {
        const res = await filesApi.getSignedUrl(fileId, 'download');
        if (res?.url) {
          setSignedUrl(res.url);
        }
      } catch (err) {
        console.warn('Could not fetch signed URL', err);
      } finally {
        setLoadingUrl(false);
      }
    };
    fetchSignedUrl();
  }, [fileId]);

  const handleDownload = async () => {
    if (!signedUrl) {
      Alert.alert('Error', 'Download link is not available.');
      return;
    }
    setDownloading(true);
    try {
      const docDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '';
      const localUri = `${docDir}${fileName}`;
      const downloadRes = await FileSystem.downloadAsync(signedUrl, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadRes.uri);
      } else {
        Alert.alert('Downloaded', `Saved to ${localUri}`);
      }
    } catch (err: any) {
      Alert.alert('Download Error', err?.message || 'Could not download file.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (signedUrl) {
      try {
        await Sharing.shareAsync(signedUrl);
      } catch {
        await WebBrowser.openBrowserAsync(signedUrl);
      }
    }
  };

  const iconName = getFileIcon(contentType);
  const iconColor = getFileColor(contentType);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top App Bar */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {fileName}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionIconButton}
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-outline" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionIconButton}
            onPress={handleDownload}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="download-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Preview Content */}
      <View style={styles.content}>
        {loadingUrl ? (
          <ActivityIndicator size="large" color={Colors.primary} />
        ) : isImage && signedUrl ? (
          <Image
            source={{ uri: signedUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: `${iconColor}18` }]}>
              <Ionicons name={iconName as any} size={48} color={iconColor} />
            </View>
            <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={2}>
              {fileName}
            </Text>
            <Text style={[styles.fileType, { color: colors.mutedForeground }]}>
              {contentType || 'Binary Data'}
            </Text>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: Colors.primary }]}
              onPress={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryActionBtnText}>Download & Open</Text>
                </>
              )}
            </TouchableOpacity>

            {isVideo && signedUrl && (
              <TouchableOpacity
                style={[styles.secondaryActionBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => WebBrowser.openBrowserAsync(signedUrl)}
              >
                <Ionicons name="play-circle-outline" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.secondaryActionBtnText, { color: colors.foreground }]}>
                  Play in Browser
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Footer Info */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>Size</Text>
          <Text style={[styles.footerVal, { color: colors.foreground }]}>{formatBytes(file.size || 0)}</Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>Uploaded</Text>
          <Text style={[styles.footerVal, { color: colors.foreground }]}>{formatDate(file.created_at || file.updated_at)}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIconButton: { padding: 4 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: { width: '100%', height: '100%' },
  card: {
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  fileName: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  fileType: { fontSize: 13, marginBottom: 24 },
  primaryActionBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
  },
  primaryActionBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryActionBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  secondaryActionBtnText: { fontSize: 15, fontWeight: '600' },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerItem: { alignItems: 'flex-start' },
  footerLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  footerVal: { fontSize: 13, fontWeight: '700' },
});
