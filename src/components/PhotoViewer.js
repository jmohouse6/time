import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import {
  Card,
  Title,
  Paragraph,
  Text,
  IconButton,
  Chip,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format, parseISO } from 'date-fns';

import { CameraService } from '../services/CameraService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PhotoViewer({ photos = [], visible, onClose, selectedPhotoIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(selectedPhotoIndex);
  const [imageLoading, setImageLoading] = useState(true);

  if (!photos || photos.length === 0) {
    return null;
  }

  const currentPhoto = photos[currentIndex];

  const navigatePhoto = (direction) => {
    if (direction === 'next' && currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setImageLoading(true);
    } else if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setImageLoading(true);
    }
  };

  const formatPhotoType = (type) => {
    return CameraService.getPhotoTypeDisplay(type);
  };

  const getPhotoTypeIcon = (type) => {
    const iconMap = {
      'clock_in': 'login',
      'clock_out': 'logout',
      'lunch_out': 'restaurant',
      'lunch_in': 'restaurant-menu',
    };
    return iconMap[type] || 'photo-camera';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="close"
            size={24}
            iconColor="#fff"
            onPress={onClose}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {currentIndex + 1} of {photos.length}
            </Text>
            <Text style={styles.headerSubtitle}>
              {formatPhotoType(currentPhoto.type)}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <IconButton
              icon="share"
              size={24}
              iconColor="#fff"
              onPress={async () => {
                try {
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(currentPhoto.uri, {
                      mimeType: 'image/jpeg',
                      dialogTitle: 'Share Timeclock Photo',
                    });
                  } else {
                    Alert.alert('Sharing Unavailable', 'Sharing is not available on this device');
                  }
                } catch (error) {
                  console.error('Error sharing photo:', error);
                  Alert.alert('Error', 'Failed to share photo');
                }
              }}
            />
          </View>
        </View>

        {/* Photo Display */}
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: currentPhoto.uri }}
            style={styles.photo}
            resizeMode="contain"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
          />

          {imageLoading && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={() => navigatePhoto('prev')}
                >
                  <Icon name="chevron-left" size={32} color="#fff" />
                </TouchableOpacity>
              )}

              {currentIndex < photos.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={() => navigatePhoto('next')}
                >
                  <Icon name="chevron-right" size={32} color="#fff" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Photo Information */}
        <ScrollView style={styles.infoContainer}>
          <Card style={styles.infoCard}>
            <Card.Content>
              <View style={styles.infoHeader}>
                <Chip
                  icon={getPhotoTypeIcon(currentPhoto.type)}
                  style={styles.typeChip}
                >
                  {formatPhotoType(currentPhoto.type)}
                </Chip>
                <Text style={styles.timestamp}>
                  {format(parseISO(currentPhoto.timestamp), 'MMM d, yyyy h:mm a')}
                </Text>
              </View>

              {currentPhoto.job && (
                <View style={styles.infoRow}>
                  <Icon name="work" size={20} color="#6200EE" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Job Site</Text>
                    <Text style={styles.infoValue}>{currentPhoto.job.name}</Text>
                  </View>
                </View>
              )}

              {currentPhoto.task && (
                <View style={styles.infoRow}>
                  <Icon name="assignment" size={20} color="#6200EE" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Task</Text>
                    <Text style={styles.infoValue}>{currentPhoto.task.name}</Text>
                  </View>
                </View>
              )}

              {currentPhoto.location && (
                <View style={styles.infoRow}>
                  <Icon name="location-on" size={20} color="#6200EE" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>
                      {currentPhoto.location.latitude?.toFixed(6)}, {currentPhoto.location.longitude?.toFixed(6)}
                    </Text>
                    {currentPhoto.location.address && (
                      <Text style={styles.infoAddress}>{currentPhoto.location.address}</Text>
                    )}
                  </View>
                </View>
              )}

              {currentPhoto.width && currentPhoto.height && (
                <View style={styles.infoRow}>
                  <Icon name="photo-size-select-actual" size={20} color="#6200EE" />
                  <View style={styles.infoText}>
                    <Text style={styles.infoLabel}>Dimensions</Text>
                    <Text style={styles.infoValue}>
                      {currentPhoto.width} × {currentPhoto.height} pixels
                    </Text>
                  </View>
                </View>
              )}

              {currentPhoto.exif && (
                <View style={styles.exifSection}>
                  <Text style={styles.exifTitle}>Camera Information</Text>
                  <Surface style={styles.exifContainer}>
                    {currentPhoto.exif.DateTime && (
                      <Text style={styles.exifText}>
                        Date: {currentPhoto.exif.DateTime}
                      </Text>
                    )}
                    {currentPhoto.exif.Make && currentPhoto.exif.Model && (
                      <Text style={styles.exifText}>
                        Camera: {currentPhoto.exif.Make} {currentPhoto.exif.Model}
                      </Text>
                    )}
                    {currentPhoto.exif.GPSLatitude && currentPhoto.exif.GPSLongitude && (
                      <Text style={styles.exifText}>
                        GPS: {currentPhoto.exif.GPSLatitude}, {currentPhoto.exif.GPSLongitude}
                      </Text>
                    )}
                  </Surface>
                </View>
              )}
            </Card.Content>
          </Card>
        </ScrollView>

        {/* Thumbnail Strip */}
        {photos.length > 1 && (
          <View style={styles.thumbnailStrip}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailContainer}
            >
              {photos.map((photo, index) => (
                <TouchableOpacity
                  key={photo.id || index}
                  onPress={() => {
                    setCurrentIndex(index);
                    setImageLoading(true);
                  }}
                  style={[
                    styles.thumbnail,
                    index === currentIndex && styles.selectedThumbnail
                  ]}
                >
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  {index === currentIndex && (
                    <View style={styles.thumbnailOverlay}>
                      <Icon name="check-circle" size={16} color="#4CAF50" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#ccc',
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
  },
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photo: {
    width: screenWidth,
    height: screenHeight * 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  infoContainer: {
    maxHeight: screenHeight * 0.3,
    backgroundColor: '#f5f5f5',
  },
  infoCard: {
    margin: 8,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeChip: {
    backgroundColor: '#E3F2FD',
  },
  timestamp: {
    color: '#666',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  infoAddress: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  exifSection: {
    marginTop: 16,
  },
  exifTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  exifContainer: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    elevation: 1,
  },
  exifText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  thumbnailStrip: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 8,
  },
  thumbnailContainer: {
    paddingHorizontal: 8,
  },
  thumbnail: {
    marginHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedThumbnail: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  thumbnailImage: {
    width: 60,
    height: 60,
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});