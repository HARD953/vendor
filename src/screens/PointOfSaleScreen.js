import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../styles/colors';

export default function PointOfSaleScreen() {
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    phone: '',
    email: '',
    address: '',
    district: '',
    region: '',
    commune: '',
    type: '',
    status: 'en_attente',
    registration_date: new Date().toISOString().split('T')[0],
    turnover: '',
    monthly_orders: '',
    evaluation_score: '',
    avatar: null,
    latitude: null,
    longitude: null,
  });

  const [pointsOfSale, setPointsOfSale] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('form'); // 'form' or 'list'

  useEffect(() => {
    loadPointsOfSale();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPointsOfSale();
    setRefreshing(false);
  };

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
  };

  const loadPointsOfSale = async () => {
    try {
      const headers = await getAuthHeader();
      
      const response = await fetch('https://backendsupply.onrender.com/api/points-vente/', {
        method: 'GET',
        headers: headers,
      });

      if (response.ok) {
        const apiPointsOfSale = await response.json();
        setPointsOfSale(apiPointsOfSale);
        await AsyncStorage.setItem('pointsOfSale', JSON.stringify(apiPointsOfSale));
      } else {
        const errorText = await response.text();
        console.error('Erreur serveur:', response.status, errorText);
        // Fallback aux données locales
        const savedPointsOfSale = await AsyncStorage.getItem('pointsOfSale');
        if (savedPointsOfSale) {
          setPointsOfSale(JSON.parse(savedPointsOfSale));
        }
      }
    } catch (error) {
      console.log('Erreur loadPointsOfSale:', error.message);
      // Fallback aux données locales
      const savedPointsOfSale = await AsyncStorage.getItem('pointsOfSale');
      if (savedPointsOfSale) {
        setPointsOfSale(JSON.parse(savedPointsOfSale));
      }
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getLocation = async () => {
    setIsGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Impossible d\'accéder à la localisation sans permission');
        setIsGettingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      updateFormData('latitude', location.coords.latitude);
      updateFormData('longitude', location.coords.longitude);
      
      Alert.alert('Succès', 'Localisation récupérée avec succès!');
    } catch (error) {
      console.error('Erreur de géolocalisation:', error);
      Alert.alert('Erreur', 'Impossible de récupérer la localisation');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'Nous avons besoin de la permission pour accéder aux photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateFormData('avatar', result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'Nous avons besoin de la permission pour accéder à l\'appareil photo');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      updateFormData('avatar', result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Ajouter une photo',
      'Choisissez une option',
      [
        { text: 'Appareil photo', onPress: takePhoto },
        { text: 'Galerie', onPress: pickImage },
        { text: 'Annuler', style: 'cancel' }
      ]
    );
  };

  const validateForm = () => {
    const requiredFields = [
      { field: 'name', message: 'Le nom du point de vente est requis' },
      { field: 'owner', message: 'Le nom du propriétaire est requis' },
      { field: 'phone', message: 'Le numéro de téléphone est requis' },
      { field: 'address', message: 'L\'adresse est requise' },
      { field: 'district', message: 'Le quartier est requis' },
      { field: 'region', message: 'La région est requise' },
      { field: 'commune', message: 'La commune est requise' },
      { field: 'type', message: 'Le type de point de vente est requis' },
    ];

    for (const { field, message } of requiredFields) {
      if (!formData[field]?.trim()) {
        Alert.alert('Erreur', message);
        return false;
      }
    }
    
    return true;
  };

  const savePointOfSale = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Ajouter les champs texte
      Object.keys(formData).forEach(key => {
        if (key !== 'avatar' && key !== 'latitude' && key !== 'longitude') {
          formDataToSend.append(key, formData[key]?.toString().trim() || '');
        }
      });
      
      // Ajouter les coordonnées GPS si disponibles
      if (formData.latitude && formData.longitude) {
        formDataToSend.append('latitude', formData.latitude.toString());
        formDataToSend.append('longitude', formData.longitude.toString());
      }
      
      // Ajouter la photo si elle existe
      if (formData.avatar) {
        formDataToSend.append('avatar', {
          uri: formData.avatar,
          name: 'point_of_sale_avatar.jpg',
          type: 'image/jpeg',
        });
      }
      
      // Récupérer le token et configurer les headers
      const headers = await getAuthHeader();
      
      // Envoyer les données au serveur
      const response = await fetch('https://backendsupply.onrender.com/api/points-vente/', {
        method: 'POST',
        body: formDataToSend,
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      
      // Mise à jour de l'état local
      const updatedPointsOfSale = [responseData, ...pointsOfSale];
      await AsyncStorage.setItem('pointsOfSale', JSON.stringify(updatedPointsOfSale));
      
      setPointsOfSale(updatedPointsOfSale);
      resetForm();
      
      Alert.alert('Succès', 'Point de vente enregistré avec succès!');
      setActiveTab('list'); // Rediriger vers la liste
    } catch (error) {
      console.error('Erreur savePointOfSale:', error);
      Alert.alert(
        'Erreur', 
        error.message || 'Erreur lors de l\'enregistrement du point de vente'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      owner: '',
      phone: '',
      email: '',
      address: '',
      district: '',
      region: '',
      commune: '',
      type: '',
      status: 'en_attente',
      registration_date: new Date().toISOString().split('T')[0],
      turnover: '',
      monthly_orders: '',
      evaluation_score: '',
      avatar: null,
      latitude: null,
      longitude: null,
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('fr-FR').format(number);
  };

  const PointOfSaleForm = () => (
    <View style={styles.formCard}>
      <View style={styles.cardHeader}>
        <Ionicons name="business" size={24} color={COLORS.primary} />
        <Text style={styles.cardTitle}>Nouveau Point de Vente</Text>
      </View>
      
      <ScrollView style={styles.formScrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom du point de vente *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            placeholder="Entrez le nom du point de vente"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Propriétaire *</Text>
          <TextInput
            style={styles.input}
            value={formData.owner}
            onChangeText={(value) => updateFormData('owner', value)}
            placeholder="Entrez le nom du propriétaire"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Téléphone *</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(value) => updateFormData('phone', value)}
            placeholder="Ex: 07 08 09 10 11"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(value) => updateFormData('email', value)}
            placeholder="Ex: exemple@email.com"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adresse *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(value) => updateFormData('address', value)}
            placeholder="Entrez l'adresse complète"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Type de point de vente *</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.typeScrollView}
          >
            <View style={styles.typeContainer}>
              {[
                { value: 'boutique', label: 'Boutique' },
                { value: 'supermarche', label: 'Supermarché' },
                { value: 'superette', label: 'Supérette' },
                { value: 'epicerie', label: 'Épicerie' },
                { value: 'demi_grossiste', label: 'Demi-Grossiste' },
                { value: 'grossiste', label: 'Grossiste' },
              ].map((item) => (
                <TouchableOpacity 
                  key={item.value}
                  style={[
                    styles.typeButton, 
                    formData.type === item.value && styles.typeButtonSelected
                  ]}
                  onPress={() => updateFormData('type', item.value)}
                >
                  <Text style={[
                    styles.typeText,
                    formData.type === item.value && styles.typeTextSelected
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1, styles.rightMargin]}>
            <Text style={styles.label}>Quartier *</Text>
            <TextInput
              style={styles.input}
              value={formData.district}
              onChangeText={(value) => updateFormData('district', value)}
              placeholder="Entrez le quartier"
            />
          </View>

          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Commune *</Text>
            <TextInput
              style={styles.input}
              value={formData.commune}
              onChangeText={(value) => updateFormData('commune', value)}
              placeholder="Entrez la commune"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Région *</Text>
          <TextInput
            style={styles.input}
            value={formData.region}
            onChangeText={(value) => updateFormData('region', value)}
            placeholder="Entrez la région"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.flex1, styles.rightMargin]}>
            <Text style={styles.label}>Chiffre d'affaires (FCFA)</Text>
            <TextInput
              style={styles.input}
              value={formData.turnover}
              onChangeText={(value) => updateFormData('turnover', value)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Commandes mensuelles</Text>
            <TextInput
              style={styles.input}
              value={formData.monthly_orders}
              onChangeText={(value) => updateFormData('monthly_orders', value)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Score d'évaluation</Text>
          <TextInput
            style={styles.input}
            value={formData.evaluation_score}
            onChangeText={(value) => updateFormData('evaluation_score', value)}
            placeholder="0.0"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Localisation</Text>
          <View style={styles.locationContainer}>
            <TouchableOpacity 
              style={[styles.locationButton, isGettingLocation && styles.locationButtonDisabled]}
              onPress={getLocation}
              disabled={isGettingLocation}
            >
              {isGettingLocation ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="location" size={20} color={COLORS.primary} />
              )}
              <Text style={styles.locationButtonText}>
                {isGettingLocation ? 'Récupération...' : 'Obtenir ma position'}
              </Text>
            </TouchableOpacity>
            
            {(formData.latitude && formData.longitude) && (
              <View style={styles.coordinatesContainer}>
                <Text style={styles.coordinatesText}>
                  Lat: {formData.latitude.toFixed(6)}
                </Text>
                <Text style={styles.coordinatesText}>
                  Long: {formData.longitude.toFixed(6)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Photo (optionnelle)</Text>
          <TouchableOpacity style={styles.photoButton} onPress={showImageOptions}>
            {formData.avatar ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: formData.avatar }} style={styles.photoPreview} />
                <Text style={styles.photoButtonText}>Changer la photo</Text>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={32} color={COLORS.textLight} />
                <Text style={styles.photoButtonText}>Ajouter une photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={savePointOfSale}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Enregistrer le point de vente</Text>
              <Ionicons name="save-outline" size={20} color={COLORS.surface} style={styles.buttonIcon} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const PointOfSaleList = () => (
    <View style={styles.pointsOfSaleCard}>
      <View style={styles.listHeader}>
        <View style={styles.listTitleContainer}>
          <Ionicons name="list" size={24} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Points de vente ({pointsOfSale.length})</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setActiveTab('form')}
        >
          <Ionicons name="add" size={24} color={COLORS.surface} />
        </TouchableOpacity>
      </View>
      
      {pointsOfSale.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="business-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyStateText}>Aucun point de vente enregistré</Text>
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={() => setActiveTab('form')}
          >
            <Text style={styles.emptyStateButtonText}>Ajouter un point de vente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.listScrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {pointsOfSale.map((point, index) => (
            <TouchableOpacity key={index} style={styles.pointItem}>
              <View style={styles.pointHeader}>
                {point.avatar ? (
                  <Image source={{ uri: point.avatar }} style={styles.pointAvatar} />
                ) : (
                  <View style={styles.pointAvatarPlaceholder}>
                    <Ionicons name="business" size={20} color={COLORS.textLight} />
                  </View>
                )}
                <View style={styles.pointTitleContainer}>
                  <Text style={styles.pointName} numberOfLines={1}>{point.name}</Text>
                  <Text style={styles.pointOwner} numberOfLines={1}>{point.owner}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  point.status === 'actif' && styles.statusActive,
                  point.status === 'inactif' && styles.statusInactive,
                ]}>
                  <Text style={styles.statusText}>{point.status}</Text>
                </View>
              </View>
              
              <View style={styles.pointDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={16} color={COLORS.textLight} />
                  <Text style={styles.pointDetail}>{point.phone}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
                  <Text style={styles.pointDetail}>{point.district}, {point.commune}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Ionicons name="pricetag-outline" size={16} color={COLORS.textLight} />
                  <Text style={styles.pointDetail}>{point.type}</Text>
                </View>
              </View>
              
              <View style={styles.pointFooter}>
                <Text style={styles.pointDate}>{formatDate(point.created_at)}</Text>
                
                {(point.turnover > 0 || point.monthly_orders > 0) && (
                  <View style={styles.pointStats}>
                    {point.turnover > 0 && (
                      <Text style={styles.statsText}>{formatNumber(point.turnover)} FCFA</Text>
                    )}
                    {point.monthly_orders > 0 && (
                      <Text style={styles.statsText}>{point.monthly_orders}/mois</Text>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'form' && styles.activeTab]}
          onPress={() => setActiveTab('form')}
        >
          <Ionicons 
            name="add-circle-outline" 
            size={20} 
            color={activeTab === 'form' ? COLORS.primary : COLORS.textLight} 
          />
          <Text style={[styles.tabText, activeTab === 'form' && styles.activeTabText]}>
            Nouveau
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}
          onPress={() => setActiveTab('list')}
        >
          <Ionicons 
            name="list-outline" 
            size={20} 
            color={activeTab === 'list' ? COLORS.primary : COLORS.textLight} 
          />
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
            Liste ({pointsOfSale.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'form' ? <PointOfSaleForm /> : <PointOfSaleList />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  formCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 20,
  },
  pointsOfSaleCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  formScrollView: {
    flex: 1,
  },
  listScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  listTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 12,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  rightMargin: {
    marginRight: 8,
  },
  typeScrollView: {
    marginHorizontal: -4,
  },
  typeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  typeButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeText: {
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 12,
  },
  typeTextSelected: {
    color: COLORS.surface,
  },
  locationContainer: {
    marginTop: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  locationButtonDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  locationButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  coordinatesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  coordinatesText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  photoButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  photoContainer: {
    alignItems: 'center',
    padding: 16,
  },
  photoPreview: {
    width: 100,
    height: 75,
    borderRadius: 8,
    marginBottom: 8,
  },
  photoPlaceholder: {
    alignItems: 'center',
    padding: 32,
  },
  photoButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    color: COLORS.textLight,
    fontSize: 16,
    marginTop: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  pointItem: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pointAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  pointAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pointTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  pointName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  pointOwner: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.borderLight,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusInactive: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  pointDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  pointDetail: {
    fontSize: 14,
    color: COLORS.text,
  },
  pointFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  pointStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.success,
  }
});