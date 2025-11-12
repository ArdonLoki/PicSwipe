import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { SwipeCard } from '@/components/swipe-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MAX_CARDS = 3;

export default function HomeScreen() {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keptPhotos, setKeptPhotos] = useState(0);
  const [deletedPhotos, setDeletedPhotos] = useState(0);
  const [photosToDelete, setPhotosToDelete] = useState<MediaLibrary.Asset[]>([]);

  useEffect(() => {
    loadPhotos();
  }, [permissionResponse]);

  const loadPhotos = async () => {
    if (permissionResponse?.status !== 'granted') {
      if (permissionResponse?.canAskAgain) {
        const result = await requestPermission();
        if (result.status !== 'granted') {
          setLoading(false);
          return;
        }
      } else {
        setLoading(false);
        return;
      }
    }

    try {
      const result = await MediaLibrary.getAssetsAsync({
        first: 100,
        mediaType: 'photo',
        sortBy: MediaLibrary.SortBy.creationTime,
      });
      setPhotos(result.assets);
    } catch (error) {
      console.error('Error loading photos:', error);
      Alert.alert('Erreur', 'Impossible de charger les photos');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeLeft = () => {
    const currentPhoto = photos[currentIndex];
    if (!currentPhoto) return;

    setPhotosToDelete((prev) => [...prev, currentPhoto]);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleSwipeRight = () => {
    setKeptPhotos((prev) => prev + 1);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleDeleteConfirm = async () => {
    if (photosToDelete.length === 0) return;

    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer ${photosToDelete.length} photo${photosToDelete.length > 1 ? 's' : ''} ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await MediaLibrary.deleteAssetsAsync(photosToDelete.map((p) => p.id));
              setDeletedPhotos(photosToDelete.length);
              setPhotosToDelete([]);
              Alert.alert('Succès', `${photosToDelete.length} photo${photosToDelete.length > 1 ? 's supprimées' : ' supprimée'}`);
            } catch (error) {
              console.error('Error deleting photos:', error);
              Alert.alert('Erreur', 'Impossible de supprimer les photos');
            }
          },
        },
      ]
    );
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      // Remove the last photo from photosToDelete if it was marked for deletion
      const previousPhoto = photos[currentIndex - 1];
      const wasMarkedForDeletion = photosToDelete.some((p) => p.id === previousPhoto.id);

      if (wasMarkedForDeletion) {
        setPhotosToDelete((prev) => prev.filter((p) => p.id !== previousPhoto.id));
      } else {
        setKeptPhotos((prev) => Math.max(0, prev - 1));
      }
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <ThemedText style={styles.loadingText}>Chargement des photos...</ThemedText>
      </ThemedView>
    );
  }

  if (permissionResponse?.status !== 'granted') {
    return (
      <ThemedView style={styles.container}>
        <IconSymbol name="photo.on.rectangle" size={80} color="#007AFF" />
        <ThemedText type="title" style={styles.permissionTitle}>
          Accès aux photos requis
        </ThemedText>
        <ThemedText style={styles.permissionText}>
          PicSwipe a besoin d'accéder à vos photos pour fonctionner
        </ThemedText>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <ThemedText style={styles.buttonText}>Autoriser l'accès</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  if (currentIndex >= photos.length) {
    return (
      <ThemedView style={styles.container}>
        <IconSymbol name="checkmark.circle.fill" size={80} color="#4CAF50" />
        <ThemedText type="title" style={styles.completeTitle}>
          Terminé!
        </ThemedText>
        <ThemedText style={styles.statsText}>
          Photos gardées: {keptPhotos}
        </ThemedText>
        <ThemedText style={styles.statsText}>
          Photos supprimées: {deletedPhotos}
        </ThemedText>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            setCurrentIndex(0);
            setKeptPhotos(0);
            setDeletedPhotos(0);
            loadPhotos();
          }}
        >
          <ThemedText style={styles.buttonText}>Recommencer</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">PicSwipe</ThemedText>
        <ThemedText style={styles.counter}>
          {currentIndex + 1} / {photos.length}
        </ThemedText>
      </View>

      <View style={styles.cardContainer}>
        {photos
          .slice(currentIndex, currentIndex + MAX_CARDS)
          .reverse()
          .map((photo, index) => (
            <SwipeCard
              key={photo.id}
              imageUri={photo.uri}
              onSwipeLeft={index === MAX_CARDS - 1 || index === photos.length - currentIndex - 1 ? handleSwipeLeft : () => {}}
              onSwipeRight={index === MAX_CARDS - 1 || index === photos.length - currentIndex - 1 ? handleSwipeRight : () => {}}
              index={MAX_CARDS - 1 - index}
            />
          ))}
      </View>

      <View style={styles.footer}>
        {photosToDelete.length > 0 && (
          <View style={styles.deleteSection}>
            <ThemedText style={styles.deleteCount}>
              {photosToDelete.length} photo{photosToDelete.length > 1 ? 's' : ''} à supprimer
            </ThemedText>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteConfirm}>
              <IconSymbol name="trash" size={20} color="#FFFFFF" />
              <ThemedText style={styles.deleteButtonText}>Supprimer</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.instructions}>
          <View style={styles.instructionItem}>
            <IconSymbol name="arrow.left" size={24} color="#FF4458" />
            <ThemedText style={styles.instructionText}>Supprimer</ThemedText>
          </View>
          <View style={styles.instructionItem}>
            <IconSymbol name="arrow.right" size={24} color="#4CAF50" />
            <ThemedText style={styles.instructionText}>Garder</ThemedText>
          </View>
        </View>

        {currentIndex > 0 && (
          <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
            <IconSymbol name="arrow.uturn.backward" size={24} color="#007AFF" />
            <ThemedText style={styles.undoText}>Annuler</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  counter: {
    fontSize: 16,
    marginTop: 8,
    opacity: 0.7,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  footer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  instructions: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instructionText: {
    fontSize: 14,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  undoText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  permissionTitle: {
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  completeTitle: {
    marginTop: 20,
    marginBottom: 24,
  },
  statsText: {
    fontSize: 18,
    marginVertical: 8,
  },
  deleteSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 68, 88, 0.1)',
    borderRadius: 15,
    width: '90%',
  },
  deleteCount: {
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '600',
    color: '#FF4458',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF4458',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
