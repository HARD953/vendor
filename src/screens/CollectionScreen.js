import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  ActivityIndicator,
  RefreshControl,
  Modal,
  StatusBar,
  Dimensions,
  LayoutAnimation,
  UIManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../styles/colors';
import { Picker } from '@react-native-picker/picker';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');

export default function CollectionScreen() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    zone: '',
    amount: '',
    phone: '',
    base: '',
    pushcard_type: '',
    photo: null,
    latitude: null,
    longitude: null,
  });

  // États pour les données de localisation
  const [villes, setVilles] = useState([]);
  const [quartiers, setQuartiers] = useState([]);
  
  // États pour les modes de saisie
  const [baseInputMode, setBaseInputMode] = useState('picker'); // 'picker' ou 'text'
  const [zoneInputMode, setZoneInputMode] = useState('picker'); // 'picker' ou 'text'

  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [showForm, setShowForm] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [stats, setStats] = useState({ total: 0, count: 0, average: 0 });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadPurchases();
    loadLocalisationData();
    animateEntrance();
  }, []);

  // Fonction pour charger les données de localisation
  const loadLocalisationData = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      };

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

  // Fonctions pour basculer entre les modes de saisie
  const toggleBaseInputMode = () => {
    setBaseInputMode(prevMode => prevMode === 'picker' ? 'text' : 'picker');
    setFormData(prev => ({ ...prev, base: '' }));
  };

  const toggleZoneInputMode = () => {
    setZoneInputMode(prevMode => prevMode === 'picker' ? 'text' : 'picker');
    setFormData(prev => ({ ...prev, zone: '' }));
  };

  useEffect(() => {
    calculateStats();
  }, [purchases]);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  };

  const animateFormToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowForm(!showForm);
  };

  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };

  const calculateStats = () => {
    const total = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.amount), 0);
    const count = purchases.length;
    const average = count > 0 ? total / count : 0;
    
    setStats({ total, count, average });
  };

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadPurchases().then(() => setRefreshing(false));
  }, []);

  const loadPurchases = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch('https://api.pushtrack360.com/api/purchases/', {
        method: 'GET',
        headers: headers,
      });

      if (response.ok) {
        const apiPurchases = await response.json();
        setPurchases(apiPurchases);
        await AsyncStorage.setItem('purchases', JSON.stringify(apiPurchases));
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log('Erreur loadPurchases:', error.message);
      const savedPurchases = await AsyncStorage.getItem('purchases');
      if (savedPurchases) {
        setPurchases(JSON.parse(savedPurchases));
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
        Alert.alert('Permission refusée', 'Impossible d\'accéder à la localisation');
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      updateFormData('latitude', location.coords.latitude);
      updateFormData('longitude', location.coords.longitude);
      
      // Success feedback
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
      
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
      updateFormData('photo', result.assets[0].uri);
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
      updateFormData('photo', result.assets[0].uri);
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

  const validateForm = () => {
    const { first_name, last_name, zone, amount, phone, base, pushcard_type } = formData;
    
    const validations = [
      { field: first_name, message: 'Le prénom est requis', condition: !first_name.trim() },
      { field: last_name, message: 'Le nom est requis', condition: !last_name.trim() },
      { field: zone, message: 'La zone de vente est requise', condition: !zone.trim() },
      { field: amount, message: 'Le montant est requis', condition: !amount.trim() },
      { field: amount, message: 'Le montant doit être un nombre valide', condition: isNaN(parseFloat(amount)) },
      { field: phone, message: 'Le numéro de téléphone est requis', condition: !phone.trim() },
      { field: base, message: 'La base est requise', condition: !base.trim() },
      { field: pushcard_type, message: 'Le type de pushcard est requis', condition: !pushcard_type.trim() },
    ];

    const error = validations.find(v => v.condition);
    if (error) {
      Alert.alert('Champ requis', error.message);
      return false;
    }
    
    return true;
  };

  const savePurchase = async () => {
    if (!validateForm()) return;

    animateButtonPress();
    setIsLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Append form data
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
          if (key === 'photo' && formData.photo) {
            formDataToSend.append('photo', {
              uri: formData.photo,
              name: 'purchase_photo.jpg',
              type: 'image/jpeg',
            });
          } else if (key === 'amount') {
            formDataToSend.append(key, parseFloat(formData[key]));
          } else {
            formDataToSend.append(key, formData[key].toString().trim());
          }
        }
      });
      
      formDataToSend.append('purchase_date', new Date().toISOString());
      
      const headers = await getAuthHeader();
      delete headers['Content-Type']; // Let React Native set content-type for FormData
      
      const response = await fetch('https://api.pushtrack360.com/api/purchases/', {
        method: 'POST',
        body: formDataToSend,
        headers: headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Success animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          tension: 50,
          friction: 3,
          useNativeDriver: true,
        })
      ]).start(() => {
        fadeAnim.setValue(1);
        scaleAnim.setValue(1);
      });

      const updatedPurchases = [responseData, ...purchases];
      setPurchases(updatedPurchases);
      await AsyncStorage.setItem('purchases', JSON.stringify(updatedPurchases));
      
      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        zone: '',
        amount: '',
        phone: '',
        base: '',
        pushcard_type: '',
        photo: null,
        latitude: null,
        longitude: null,
      });
      
      setShowForm(false);
      
    } catch (error) {
      console.error('Erreur savePurchase:', error);
      Alert.alert(
        'Erreur d\'enregistrement', 
        'Impossible de sauvegarder le pushcard. Vérifiez votre connexion.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fonction pour obtenir les 20 derniers pushcards
  const getRecentPurchases = (purchasesList) => {
    return purchasesList
      .sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date))
      .slice(0, 20);
  };

  const filteredPurchases = getRecentPurchases(
    purchases.filter(purchase => {
      const searchLower = searchQuery.toLowerCase();
      return (
        purchase.first_name?.toLowerCase().includes(searchLower) ||
        purchase.last_name?.toLowerCase().includes(searchLower) ||
        purchase.phone?.includes(searchQuery) ||
        purchase.zone?.toLowerCase().includes(searchLower)
      );
    })
  ).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.purchase_date) - new Date(a.purchase_date);
      case 'amount':
        return b.amount - a.amount;
      case 'name':
        return (a.first_name || '').localeCompare(b.first_name || '');
      default:
        return 0;
    }
  });

  const openPurchaseDetails = (purchase) => {
    setSelectedPurchase(purchase);
    setShowPurchaseModal(true);
  };

  const getPushcardColor = (type) => {
    switch (type) {
      case 'pushcard': return '#4CAF50';
      case 'TopTop': return '#2196F3';
      case 'Owner': return '#FF9800';
      default: return COLORS.primary;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.background}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#FFFFFF']}
                tintColor="#FFFFFF"
              />
            }
          >
            {/* Header avec statistiques */}
            <Animated.View 
              style={[
                styles.header,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideUpAnim }]
                }
              ]}
            >
              <View style={styles.headerContent}>
                <View>
                  <Text style={styles.headerTitle}>Pushcards</Text>
                  <Text style={styles.headerSubtitle}>Gestion des ventes</Text>
                </View>
                <TouchableOpacity style={styles.syncButton} onPress={loadPurchases}>
                  <Ionicons name="refresh" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{stats.count}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{formatAmount(stats.total)}</Text>
                  <Text style={styles.statLabel}>Chiffre d'affaire</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{formatAmount(stats.average)}</Text>
                  <Text style={styles.statLabel}>Moyenne</Text>
                </View>
              </View>
            </Animated.View>

            {/* Formulaire principal */}
            <Animated.View 
              style={[
                styles.mainCard,
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: slideUpAnim }, { scale: scaleAnim }]
                }
              ]}
            >
              <TouchableOpacity 
                style={styles.formHeader}
                onPress={animateFormToggle}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.formHeaderGradient}
                >
                  <View style={styles.formHeaderContent}>
                    <View style={styles.formTitleContainer}>
                      <Ionicons name="add-circle" size={28} color="#FFF" />
                      <Text style={styles.formTitle}>Nouveau Pushcard</Text>
                    </View>
                    <Ionicons 
                      name={showForm ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color="#FFF" 
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              
              {showForm && (
                <Animated.View style={styles.formContent}>
                  <View style={styles.inputRow}>
                    <View style={[styles.inputGroup, styles.halfInput]}>
                      <Text style={styles.label}>Prénom *</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.first_name}
                        onChangeText={(value) => updateFormData('first_name', value)}
                        placeholder="Prénom du client"
                        placeholderTextColor={COLORS.textLight}
                      />
                    </View>

                    <View style={[styles.inputGroup, styles.halfInput]}>
                      <Text style={styles.label}>Nom *</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.last_name}
                        onChangeText={(value) => updateFormData('last_name', value)}
                        placeholder="Nom du client"
                        placeholderTextColor={COLORS.textLight}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Téléphone *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.phone}
                      onChangeText={(value) => updateFormData('phone', value)}
                      placeholder="07 08 09 10 11"
                      placeholderTextColor={COLORS.textLight}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Type Pushcard *</Text>
                    <View style={styles.radioGroup}>
                      {['pushcard', 'TopTop', 'Owner'].map((type) => (
                        <TouchableOpacity 
                          key={type}
                          style={[
                            styles.radioButton, 
                            formData.pushcard_type === type && [
                              styles.radioButtonSelected,
                              { backgroundColor: getPushcardColor(type) }
                            ]
                          ]}
                          onPress={() => updateFormData('pushcard_type', type)}
                        >
                          <Text style={[
                            styles.radioText,
                            formData.pushcard_type === type && styles.radioTextSelected
                          ]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Base avec choix de mode */}
                  <View style={styles.inputGroup}>
                    <View style={styles.inputHeader}>
                      <Text style={styles.label}>Base *</Text>
                      <TouchableOpacity 
                        style={styles.inputModeToggle}
                        onPress={toggleBaseInputMode}
                      >
                        <Text style={styles.inputModeToggleText}>
                          {baseInputMode === 'picker' ? '📝 Saisir' : '📋 Liste'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {baseInputMode === 'picker' ? (
                      // Mode liste déroulante
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={formData.base}
                          onValueChange={(value) => updateFormData('base', value)}
                          style={styles.picker}
                        >
                          <Picker.Item label="Sélectionner une ville" value="" />
                          {villes.map((ville) => (
                            <Picker.Item 
                              key={ville.id} 
                              label={ville.nom} 
                              value={ville.nom} 
                            />
                          ))}
                        </Picker>
                      </View>
                    ) : (
                      // Mode saisie manuelle
                      <TextInput
                        style={styles.input}
                        value={formData.base}
                        onChangeText={(value) => updateFormData('base', value)}
                        placeholder="Saisir la base (ex: Abidjan, Bouaké...)"
                        placeholderTextColor={COLORS.textLight}
                      />
                    )}
                  </View>

                  {/* Zone de vente avec choix de mode */}
                  <View style={styles.inputGroup}>
                    <View style={styles.inputHeader}>
                      <Text style={styles.label}>Zone de vente *</Text>
                      <TouchableOpacity 
                        style={styles.inputModeToggle}
                        onPress={toggleZoneInputMode}
                      >
                        <Text style={styles.inputModeToggleText}>
                          {zoneInputMode === 'picker' ? '📝 Saisir' : '📋 Liste'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {zoneInputMode === 'picker' ? (
                      // Mode liste déroulante
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={formData.zone}
                          onValueChange={(value) => updateFormData('zone', value)}
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
                    ) : (
                      // Mode saisie manuelle
                      <TextInput
                        style={styles.input}
                        value={formData.zone}
                        onChangeText={(value) => updateFormData('zone', value)}
                        placeholder="Saisir le quartier (ex: Cocody, Yopougon...)"
                        placeholderTextColor={COLORS.textLight}
                      />
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Chiffre d'affaire (FCFA) *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.amount}
                      onChangeText={(value) => updateFormData('amount', value)}
                      placeholder="0"
                      placeholderTextColor={COLORS.textLight}
                      keyboardType="numeric"
                    />
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
                        color={formData.photo ? COLORS.success : COLORS.primary} 
                      />
                      <Text style={styles.actionButtonText}>
                        {formData.photo ? '📸 Photo' : '📷 Photo'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                    <TouchableOpacity
                      style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                      onPress={savePurchase}
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
                            <Text style={styles.saveButtonText}>Enregistrer le Pushcard</Text>
                            <Ionicons name="checkmark-circle" size={22} color="#FFF" />
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                </Animated.View>
              )}
            </Animated.View>

            {/* Liste des pushcards */}
            <Animated.View 
              style={[
                styles.listCard,
                { opacity: fadeAnim }
              ]}
            >
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>20 Derniers Pushcards</Text>
                <Text style={styles.listCount}>{filteredPurchases.length}</Text>
              </View>

              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un pushcard..."
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

              <View style={styles.filterTabs}>
                {[
                  { key: 'date', label: '📅 Récent', icon: 'time' },
                  { key: 'amount', label: '💰 Montant', icon: 'cash' },
                  { key: 'name', label: '👤 Nom', icon: 'person' }
                ].map((tab) => (
                  <TouchableOpacity 
                    key={tab.key}
                    style={[
                      styles.filterTab, 
                      sortBy === tab.key && styles.filterTabActive
                    ]}
                    onPress={() => setSortBy(tab.key)}
                  >
                    <Ionicons 
                      name={tab.icon} 
                      size={16} 
                      color={sortBy === tab.key ? '#FFF' : COLORS.primary} 
                    />
                    <Text style={[
                      styles.filterTabText,
                      sortBy === tab.key && styles.filterTabTextActive
                    ]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {filteredPurchases.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
                  <Text style={styles.emptyStateTitle}>
                    {searchQuery ? 'Aucun résultat' : 'Aucun pushcard'}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {searchQuery ? 'Aucun pushcard ne correspond à votre recherche' : 'Commencez par ajouter votre premier pushcard'}
                  </Text>
                </View>
              ) : (
                filteredPurchases.map((purchase, index) => (
                  <TouchableOpacity 
                    key={purchase.id || index}
                    style={styles.purchaseItem}
                    onPress={() => openPurchaseDetails(purchase)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.purchaseTypeIndicator,
                      { backgroundColor: getPushcardColor(purchase.pushcard_type) }
                    ]} />
                    
                    <View style={styles.purchaseAvatar}>
                      <Text style={styles.avatarText}>
                        {purchase.first_name?.charAt(0)}{purchase.last_name?.charAt(0)}
                      </Text>
                    </View>
                    
                    <View style={styles.purchaseInfo}>
                      <Text style={styles.purchaseName}>
                        {purchase.first_name} {purchase.last_name}
                      </Text>
                      <Text style={styles.purchasePhone}>{purchase.phone}</Text>
                      <View style={styles.purchaseMeta}>
                        <Text style={styles.purchaseZone}>{purchase.zone}</Text>
                        <Text style={styles.purchaseDate}>{formatDate(purchase.purchase_date)}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.purchaseAmount}>
                      <Text style={styles.amountText}>{formatAmount(purchase.amount)}</Text>
                      <Text style={styles.pushcardType}>{purchase.pushcard_type}</Text>
                    </View>
                    
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                  </TouchableOpacity>
                ))
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Modal de détail */}
      <Modal
        visible={showPurchaseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.modalHeader}
            >
              <View style={styles.modalHeaderContent}>
                <Text style={styles.modalTitle}>Détails du Pushcard</Text>
                <TouchableOpacity 
                  onPress={() => setShowPurchaseModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
            
            {selectedPurchase && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Ionicons name="person" size={20} color={COLORS.textLight} />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Client</Text>
                      <Text style={styles.detailValue}>
                        {selectedPurchase.first_name} {selectedPurchase.last_name}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="call" size={20} color={COLORS.textLight} />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Téléphone</Text>
                      <Text style={styles.detailValue}>{selectedPurchase.phone}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="pricetag" size={20} color={COLORS.textLight} />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={[styles.detailValue, { color: getPushcardColor(selectedPurchase.pushcard_type) }]}>
                        {selectedPurchase.pushcard_type}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="business" size={20} color={COLORS.textLight} />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Base</Text>
                      <Text style={styles.detailValue}>{selectedPurchase.base}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={20} color={COLORS.textLight} />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Zone</Text>
                      <Text style={styles.detailValue}>{selectedPurchase.zone}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="cash" size={20} color={COLORS.textLight} />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Montant</Text>
                      <Text style={[styles.detailValue, styles.amountHighlight]}>
                        {formatAmount(selectedPurchase.amount)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={20} color={COLORS.textLight} />
                    <View style={styles.detailText}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{formatDate(selectedPurchase.purchase_date)}</Text>
                    </View>
                  </View>
                  
                  {selectedPurchase.photo && (
                    <View style={styles.photoSection}>
                      <Text style={styles.photoLabel}>Photo</Text>
                      <Image 
                        source={{ uri: selectedPurchase.photo }} 
                        style={styles.detailPhoto}
                      />
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  syncButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
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
    textAlign: 'center',
  },
  mainCard: {
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
    borderRadius: 20,
    overflow: 'hidden',
  },
  formHeaderGradient: {
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
  formContent: {
    padding: 24,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginRight: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  inputModeToggle: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inputModeToggleText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
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
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  radioButtonSelected: {
    borderColor: 'transparent',
  },
  radioText: {
    color: COLORS.text,
    fontWeight: '500',
  },
  radioTextSelected: {
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
    marginLeft: 8,
    color: COLORS.text,
    fontWeight: '500',
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
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  listCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
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
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    marginLeft: 6,
    color: COLORS.text,
    fontWeight: '500',
    fontSize: 14,
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
    lineHeight: 20,
  },
  purchaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  purchaseTypeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  purchaseAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  purchaseInfo: {
    flex: 1,
  },
  purchaseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  purchasePhone: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  purchaseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  purchaseZone: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  purchaseDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  purchaseAmount: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 2,
  },
  pushcardType: {
    fontSize: 12,
    color: COLORS.textLight,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 24,
  },
  detailSection: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailText: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  amountHighlight: {
    color: COLORS.success,
    fontWeight: 'bold',
  },
  photoSection: {
    marginTop: 16,
  },
  photoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  detailPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
});