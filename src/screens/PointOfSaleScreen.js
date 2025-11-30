import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  RefreshControl,
  Animated,
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../styles/colors';
import { Picker } from '@react-native-picker/picker';

const { width, height } = Dimensions.get('window');

// Composant de formulaire séparé
const PointOfSaleForm = React.memo(({ 
  onSave, 
  onTabChange, 
  initialData = {} 
}) => {
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
    brander: false,
    marque_brander: '',
    branding_image: null, // Nouveau champ pour l'image de branding
    ...initialData
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Références pour les inputs
  const inputRefs = useRef({});
  
  // Animations locales
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

    // AJOUT: États pour les listes déroulantes
  const [districts, setDistricts] = useState([]);
  const [villes, setVilles] = useState([]);
  const [quartiers, setQuartiers] = useState([]);


  useEffect(() => {
    // loadPointsOfSale();
    loadLocalisationData(); // AJOUT
  }, []);

  // AJOUT: Fonction pour charger les données de localisation
  const loadLocalisationData = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

      // Charger les districts
      const districtsResponse = await fetch('https://api.pushtrack360.com/api/districts/', {
        method: 'GET',
        headers: headers,
      });
      
      if (districtsResponse.ok) {
        const districtsData = await districtsResponse.json();
        setDistricts(districtsData);
      }

      // Charger les villes
      const villesResponse = await fetch('https://api.pushtrack360.com/api/villes/', {
        method: 'GET',
        headers: headers,
      });
      
      if (villesResponse.ok) {
        const villesData = await villesResponse.json();
        setVilles(villesData);
      }

      // Charger les quartiers
      const quartiersResponse = await fetch('https://api.pushtrack360.com/api/quartiers/', {
        method: 'GET',
        headers: headers,
      });
      
      if (quartiersResponse.ok) {
        const quartiersData = await quartiersResponse.json();
        setQuartiers(quartiersData);
      }
    } catch (error) {
      console.error('Erreur chargement localisation:', error);
    }
  };

  useEffect(() => {
    animateEntrance();
  }, []);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Mise à jour locale du formulaire - NE PAS utiliser useCallback pour éviter les problèmes de closure
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
        Alert.alert('Permission refusée', 'Impossible d\'accéder à la localisation');
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      updateFormData('latitude', location.coords.latitude);
      updateFormData('longitude', location.coords.longitude);
      
    } catch (error) {
      console.error('Erreur de géolocalisation:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir la localisation');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'Autorisation d\'accès aux photos nécessaire');
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
      Alert.alert('Permission requise', 'Autorisation d\'accès à la caméra nécessaire');
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
      'Choisissez une source',
      [
        { text: '📷 Appareil photo', onPress: takePhoto },
        { text: '🖼️ Galerie', onPress: pickImage },
        { text: 'Annuler', style: 'cancel' }
      ]
    );
  };

  const pickBrandingImage = async () => {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (!permissionResult.granted) {
    Alert.alert('Permission requise', 'Autorisation d\'accès aux photos nécessaire');
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled) {
    updateFormData('branding_image', result.assets[0].uri);
  }
};

const takeBrandingPhoto = async () => {
  const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
  
  if (!permissionResult.granted) {
    Alert.alert('Permission requise', 'Autorisation d\'accès à la caméra nécessaire');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled) {
    updateFormData('branding_image', result.assets[0].uri);
  }
};

const showBrandingImageOptions = () => {
  Alert.alert(
    'Image de branding',
    'Choisissez une source',
    [
      { text: '📷 Appareil photo', onPress: takeBrandingPhoto },
      { text: '🖼️ Galerie', onPress: pickBrandingImage },
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
        Alert.alert('Champ requis', message);
        return false;
      }
    }

    if (formData.brander && !formData.marque_brander.trim()) {
      Alert.alert('Champ requis', 'Le nom de la marque est requis pour un point de vente brandé');
      return false;
    }
    
    return true;
  };

const handleSave = async () => {
  if (!validateForm()) return;

  setIsLoading(true);
  
  try {
    await onSave(formData);
    // Reset form after successful save
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
      brander: false,
      marque_brander: '',
      branding_image: null, // Reset de l'image de branding
    });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
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
      brander: false,
      marque_brander: '',
    });
  };

  return (
    <Animated.View 
      style={[
        styles.formCard,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.formHeader}
      >
        <View style={styles.formHeaderContent}>
          <View style={styles.formTitleContainer}>
            <Ionicons name="business" size={28} color="#FFF" />
            <Text style={styles.formTitle}>Nouveau Point de Vente</Text>
          </View>
          <TouchableOpacity onPress={resetForm}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      <ScrollView 
        style={styles.formScrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nom du point de vente *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => updateFormData('name', value)}
            placeholder="Entrez le nom du point de vente"
            placeholderTextColor={COLORS.textLight}
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Propriétaire *</Text>
          <TextInput
            style={styles.input}
            value={formData.owner}
            onChangeText={(value) => updateFormData('owner', value)}
            placeholder="Entrez le nom du propriétaire"
            placeholderTextColor={COLORS.textLight}
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, styles.flex1, styles.rightMargin]}>
            <Text style={styles.label}>Téléphone *</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(value) => updateFormData('phone', value)}
              placeholder="07 08 09 10 11"
              placeholderTextColor={COLORS.textLight}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
          </View>

          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              placeholder="exemple@email.com"
              placeholderTextColor={COLORS.textLight}
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adresse *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(value) => updateFormData('address', value)}
            placeholder="Entrez l'adresse complète"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={3}
            returnKeyType="next"
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
                { value: 'boutique', label: '🏪 Boutique', icon: 'storefront' },
                { value: 'supermarche', label: '🛒 Supermarché', icon: 'cart' },
                { value: 'superette', label: '🏬 Supérette', icon: 'business' },
                { value: 'epicerie', label: '🥫 Épicerie', icon: 'basket' },
                { value: 'demi_grossiste', label: '📦 Demi-Grossiste', icon: 'cube' },
                { value: 'grossiste', label: '🚚 Grossiste', icon: 'car' },
              ].map((item) => (
                <TouchableOpacity 
                  key={item.value}
                  style={[
                    styles.typeButton, 
                    formData.type === item.value && styles.typeButtonSelected
                  ]}
                  onPress={() => updateFormData('type', item.value)}
                >
                  <Ionicons 
                    name={item.icon} 
                    size={16} 
                    color={formData.type === item.value ? '#FFF' : COLORS.primary} 
                  />
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Point de vente brandé ?</Text>
          <View style={styles.brandContainer}>
            <TouchableOpacity 
              style={[
                styles.brandOption,
                !formData.brander && styles.brandOptionSelected
              ]}
              onPress={() => {
                updateFormData('brander', false);
                updateFormData('marque_brander', '');
              }}
            >
              <Ionicons 
                name="business-outline" 
                size={20} 
                color={!formData.brander ? '#FFF' : COLORS.text} 
              />
              <Text style={[
                styles.brandOptionText,
                !formData.brander && styles.brandOptionTextSelected
              ]}>
                Non Brandé
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.brandOption,
                formData.brander && styles.brandOptionSelected
              ]}
              onPress={() => updateFormData('brander', true)}
            >
              <Ionicons 
                name="star" 
                size={20} 
                color={formData.brander ? '#FFF' : COLORS.text} 
              />
              <Text style={[
                styles.brandOptionText,
                formData.brander && styles.brandOptionTextSelected
              ]}>
                Brandé
              </Text>
            </TouchableOpacity>
          </View>
        </View>
          {formData.brander && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de la marque *</Text>
              <TextInput
                style={styles.input}
                value={formData.marque_brander}
                onChangeText={(value) => updateFormData('marque_brander', value)}
                placeholder="Entrez le nom de la marque"
                placeholderTextColor={COLORS.textLight}
                returnKeyType="next"
              />
              
              {/* Nouvelle section pour l'image de branding */}
              <View style={styles.brandingImageSection}>
                <Text style={styles.label}>Image de branding</Text>
                <TouchableOpacity 
                  style={styles.brandingImageButton}
                  onPress={showBrandingImageOptions}
                >
                  {formData.branding_image ? (
                    <View style={styles.brandingImagePreview}>
                      <Image 
                        source={{ uri: formData.branding_image }} 
                        style={styles.brandingImage} 
                      />
                      <View style={styles.brandingImageOverlay}>
                        <Ionicons name="camera" size={24} color="#FFF" />
                        <Text style={styles.brandingImageText}>Modifier l'image</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.brandingImagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color={COLORS.primary} />
                      <Text style={styles.brandingImagePlaceholderText}>
                        Ajouter une image de branding
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        <View style={styles.inputRow}>
          {/* <View style={[styles.inputGroup, styles.flex1, styles.rightMargin]}>
            <Text style={styles.label}>Quartier *</Text>
            <TextInput
              style={styles.input}
              value={formData.district}
              onChangeText={(value) => updateFormData('district', value)}
              placeholder="Entrez le quartier"
              placeholderTextColor={COLORS.textLight}
              returnKeyType="next"
            />
          </View> */}

          <View style={[styles.inputGroup, styles.flex1, styles.rightMargin]}>
            <Text style={styles.label}>Quartier *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.district}
                onValueChange={(value) => updateFormData('district', value)}
                style={styles.picker}
              >
                <Picker.Item label="Sélectionner un quartier" value="" />
                {quartiers.map((quartier) => (
                  <Picker.Item 
                    key={quartier.id} 
                    label={quartier.nom} 
                    value={quartier.nom} 
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Commune *</Text>
            <TextInput
              style={styles.input}
              value={formData.commune}
              onChangeText={(value) => updateFormData('commune', value)}
              placeholder="Entrez la commune"
              placeholderTextColor={COLORS.textLight}
              returnKeyType="next"
            />
          </View> */}


          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Commune *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.commune}
                onValueChange={(value) => updateFormData('commune', value)}
                style={styles.picker}
              >
                <Picker.Item label="Sélectionner une commune" value="" />
                {villes.map((ville) => (
                  <Picker.Item 
                    key={ville.id} 
                    label={ville.nom} 
                    value={ville.nom} 
                  />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* <View style={styles.inputGroup}>
          <Text style={styles.label}>Région *</Text>
          <TextInput
            style={styles.input}
            value={formData.region}
            onChangeText={(value) => updateFormData('region', value)}
            placeholder="Entrez la région"
            placeholderTextColor={COLORS.textLight}
            returnKeyType="next"
          />
        </View> */}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Région *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.region}
              onValueChange={(value) => updateFormData('region', value)}
              style={styles.picker}
            >
              <Picker.Item label="Sélectionner une région" value="" />
              {districts.map((district) => (
                <Picker.Item 
                  key={district.id} 
                  label={district.nom} 
                  value={district.nom} 
                />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={[styles.inputGroup, styles.flex1, styles.rightMargin]}>
            <Text style={styles.label}>Chiffre d'affaires (FCFA)</Text>
            <TextInput
              style={styles.input}
              value={formData.turnover}
              onChangeText={(value) => updateFormData('turnover', value)}
              placeholder="0"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>

          <View style={[styles.inputGroup, styles.flex1]}>
            <Text style={styles.label}>Commandes mensuelles</Text>
            <TextInput
              style={styles.input}
              value={formData.monthly_orders}
              onChangeText={(value) => updateFormData('monthly_orders', value)}
              placeholder="0"
              placeholderTextColor={COLORS.textLight}
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.locationButton]}
            onPress={getLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons 
                name="location" 
                size={20} 
                color={formData.latitude ? COLORS.success : COLORS.primary} 
              />
            )}
            <Text style={styles.actionButtonText}>
              {formData.latitude ? '📍 Localisé' : '🌍 Localisation'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.photoButton]}
            onPress={showImageOptions}
          >
            <Ionicons 
              name="camera" 
              size={20} 
              color={formData.avatar ? COLORS.success : COLORS.primary} 
            />
            <Text style={styles.actionButtonText}>
              {formData.avatar ? '📸 Photo' : '📷 Photo'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            style={styles.saveButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <View style={styles.saveButtonContent}>
                <Text style={styles.saveButtonText}>Enregistrer le Point de Vente</Text>
                <Ionicons name="checkmark-circle" size={22} color="#FFF" />
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
});

// Composant principal
export default function PointOfSaleScreen() {
  const [pointsOfSale, setPointsOfSale] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('form');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({ total: 0, active: 0, branded: 0 });

  useEffect(() => {
    loadPointsOfSale();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [pointsOfSale]);

  const calculateStats = () => {
    const total = pointsOfSale.length;
    const active = pointsOfSale.filter(pos => pos.status === 'actif').length;
    const branded = pointsOfSale.filter(pos => pos.brander).length;
    
    setStats({ total, active, branded });
  };

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
      
      const response = await fetch('https://api.pushtrack360.com/api/points-vente/', {
        method: 'GET',
        headers: headers,
      });

      if (response.ok) {
        const apiPointsOfSale = await response.json();
        setPointsOfSale(apiPointsOfSale);
        await AsyncStorage.setItem('pointsOfSale', JSON.stringify(apiPointsOfSale));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log('Erreur loadPointsOfSale:', error.message);
      const savedPointsOfSale = await AsyncStorage.getItem('pointsOfSale');
      if (savedPointsOfSale) {
        setPointsOfSale(JSON.parse(savedPointsOfSale));
      }
    }
  };

const handleSavePointOfSale = async (formData) => {
  try {
    const formDataToSend = new FormData();
    
    // Ajouter les champs texte
    Object.keys(formData).forEach(key => {
      if (key !== 'avatar' && key !== 'branding_image' && key !== 'latitude' && key !== 'longitude') {
        const value = formData[key];
        if (value !== null && value !== undefined && value !== '') {
          formDataToSend.append(key, value.toString().trim());
        }
      }
    });
    
    // Ajouter les coordonnées GPS si disponibles
    if (formData.latitude && formData.longitude) {
      formDataToSend.append('latitude', formData.latitude.toString());
      formDataToSend.append('longitude', formData.longitude.toString());
    }
    
    // Ajouter la photo du point de vente si elle existe
    if (formData.avatar) {
      formDataToSend.append('avatar', {
        uri: formData.avatar,
        name: 'point_of_sale_avatar.jpg',
        type: 'image/jpeg',
      });
    }
    
    // Ajouter l'image de branding si elle existe
    if (formData.branding_image) {
      formDataToSend.append('branding_image', {
        uri: formData.branding_image,
        name: 'branding_image.jpg',
        type: 'image/jpeg',
      });
    }
    
    const headers = await getAuthHeader();
    delete headers['Content-Type'];
    
    const response = await fetch('https://api.pushtrack360.com/api/points-vente/', {
      method: 'POST',
      body: formDataToSend,
      headers: headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur serveur: ${response.status}`);
    }

    const responseData = await response.json();
    
    const updatedPointsOfSale = [responseData, ...pointsOfSale];
    setPointsOfSale(updatedPointsOfSale);
    await AsyncStorage.setItem('pointsOfSale', JSON.stringify(updatedPointsOfSale));
    
    setActiveTab('list');
    
    Alert.alert('Succès', 'Point de vente enregistré avec succès!');
    
  } catch (error) {
    console.error('Erreur savePointOfSale:', error);
    Alert.alert(
      'Erreur d\'enregistrement', 
      'Impossible de sauvegarder le point de vente. Vérifiez votre connexion.'
    );
    throw error;
  }
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

  const filteredPointsOfSale = pointsOfSale.filter(point => {
    const matchesSearch = 
      point.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      point.owner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      point.phone?.includes(searchQuery) ||
      point.district?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || point.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const PointOfSaleList = React.memo(() => (
    <View style={styles.listCard}>
      {/* Header avec statistiques */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.listHeader}
      >
        <View style={styles.listHeaderContent}>
          <View>
            <Text style={styles.listTitle}>Points de Vente</Text>
            <Text style={styles.listSubtitle}>Gestion commerciale</Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setActiveTab('form')}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.active}</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.branded}</Text>
            <Text style={styles.statLabel}>Brandés</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Barre de recherche et filtres */}
      <View style={styles.listControls}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un point de vente..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {[
            { key: 'all', label: 'Tous', icon: 'apps' },
            { key: 'actif', label: 'Actifs', icon: 'checkmark-circle' },
            { key: 'inactif', label: 'Inactifs', icon: 'close-circle' },
            { key: 'en_attente', label: 'En attente', icon: 'time' },
          ].map((filter) => (
            <TouchableOpacity 
              key={filter.key}
              style={[
                styles.filterButton,
                filterStatus === filter.key && styles.filterButtonActive
              ]}
              onPress={() => setFilterStatus(filter.key)}
            >
              <Ionicons 
                name={filter.icon} 
                size={16} 
                color={filterStatus === filter.key ? '#FFF' : COLORS.primary} 
              />
              <Text style={[
                styles.filterButtonText,
                filterStatus === filter.key && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des points de vente */}
      <ScrollView 
        style={styles.listScrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      >
        {filteredPointsOfSale.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>
              {searchQuery || filterStatus !== 'all' ? 'Aucun résultat' : 'Aucun point de vente'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery || filterStatus !== 'all' 
                ? 'Aucun point de vente ne correspond à votre recherche' 
                : 'Commencez par ajouter votre premier point de vente'
              }
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setActiveTab('form');
              }}
            >
              <Text style={styles.emptyStateButtonText}>Ajouter un point de vente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredPointsOfSale.map((point, index) => (
            <TouchableOpacity key={point.id || index} style={styles.pointItem}>
              <View style={[
                styles.statusIndicator,
                point.status === 'actif' && styles.statusActive,
                point.status === 'inactif' && styles.statusInactive,
                point.status === 'en_attente' && styles.statusPending,
              ]} />
              
              <View style={styles.pointContent}>
                  <View style={styles.pointHeader}>
                    {point.avatar ? (
                      <Image source={{ uri: point.avatar }} style={styles.pointAvatar} />
                    ) : (
                      <View style={styles.pointAvatarPlaceholder}>
                        <Ionicons name="business" size={20} color={COLORS.textLight} />
                      </View>
                    )}
                    
                    <View style={styles.pointInfo}>
                      <View style={styles.pointTitleRow}>
                        <Text style={styles.pointName} numberOfLines={1}>{point.name}</Text>
                        
                        {/* Badge brandé à droite du nom */}
                        {point.brander && (
                          <View style={styles.brandedBadge}>
                            <Ionicons name="star" size={12} color="#FFF" />
                            <Text style={styles.brandedText}>Brandé</Text>
                          </View>
                        )}
                      </View>
                      
                      <Text style={styles.pointOwner} numberOfLines={1}>{point.owner}</Text>
                      
                      {/* Nom de la marque et image de branding */}
                      {point.brander && point.marque_brander && (
                        <View style={styles.brandingInfo}>
                          <Text style={styles.brandName} numberOfLines={1}>
                            {point.marque_brander}
                          </Text>
                          
                          {/* Image de branding à droite du nom de marque */}
                          {point.branding_image ? (
                            <Image 
                              source={{ uri: point.branding_image }} 
                              style={styles.brandingImageSmall} 
                            />
                          ) : point.brander && (
                            <View style={styles.brandingPlaceholderSmall}>
                              <Ionicons name="image-outline" size={16} color={COLORS.textLight} />
                            </View>
                          )}
                        </View>
                      )}
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
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  ));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.background}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          {/* Navigation par onglets */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'form' && styles.activeTab]}
              onPress={() => setActiveTab('form')}
            >
              <Ionicons 
                name="add-circle" 
                size={22} 
                color={activeTab === 'form' ? '#FFF' : 'rgba(255,255,255,0.7)'} 
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
                name="list" 
                size={22} 
                color={activeTab === 'list' ? '#FFF' : 'rgba(255,255,255,0.7)'} 
              />
              <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
                Liste ({pointsOfSale.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'form' ? 
            <PointOfSaleForm 
              onSave={handleSavePointOfSale}
              onTabChange={setActiveTab}
            /> : 
            <PointOfSaleList />
          }
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

// Les styles restent exactement les mêmes que dans votre code original
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  background: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: 16,
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  activeTabText: {
    color: '#FFF',
  },
  formCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  formHeader: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  formHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 12,
  },
  formScrollView: {
    flex: 1,
  },
  formContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  rightMargin: {
    marginRight: 12,
  },
  typeScrollView: {
    marginHorizontal: -4,
  },
  typeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 4,
    marginBottom: 8,
    gap: 6,
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
    color: '#FFF',
  },
  brandContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 4,
  },
  brandOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  brandOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  brandOptionText: {
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 14,
  },
  brandOptionTextSelected: {
    color: '#FFF',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 6,
    gap: 8,
  },
  locationButton: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  photoButton: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  actionButtonText: {
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 14,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  listHeader: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  listHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  listControls: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  filterContainer: {
    marginHorizontal: -4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 4,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 12,
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  listScrollView: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  pointItem: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusIndicator: {
    width: 4,
    backgroundColor: COLORS.textLight,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: '#F44336',
  },
  statusPending: {
    backgroundColor: '#FF9800',
  },
  pointContent: {
    flex: 1,
    padding: 16,
  },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pointAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  pointAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pointInfo: {
    flex: 1,
  },
  pointTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pointName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  brandedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  brandedText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pointOwner: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  brandName: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  pointDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
    gap: 2,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.success,
  },
  // Ajouter ces styles à votre objet StyleSheet
brandingImageSection: {
  marginTop: 16,
},
brandingImageButton: {
  borderWidth: 2,
  borderColor: COLORS.border,
  borderStyle: 'dashed',
  borderRadius: 12,
  overflow: 'hidden',
},
brandingImagePreview: {
  position: 'relative',
  height: 120,
},
brandingImage: {
  width: '100%',
  height: '100%',
},
brandingImageOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.3)',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},
brandingImageText: {
  color: '#FFF',
  fontSize: 14,
  fontWeight: '500',
},
brandingImagePlaceholder: {
  height: 120,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},
brandingImagePlaceholderText: {
  color: COLORS.textLight,
  fontSize: 14,
  textAlign: 'center',
},
brandingImageSmall: {
  width: 40,
  height: 40,
  borderRadius: 8,
  marginLeft: 8,
},
brandingPlaceholderSmall: {
  width: 40,
  height: 40,
  borderRadius: 8,
  backgroundColor: COLORS.borderLight,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 8,
},

  // AJOUT: Styles pour les listes déroulantes
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  picker: {
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
});