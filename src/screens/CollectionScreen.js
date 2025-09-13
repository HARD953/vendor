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
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../styles/colors';
import DateTimePicker from '@react-native-community/datetimepicker';

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

  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    loadPurchases();
    animateComponents();
  }, []);

  const animateComponents = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
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
      
      const response = await fetch('https://backendsupply.onrender.com/api/purchases/', {
        method: 'GET',
        headers: headers,
      });

      if (response.ok) {
        const apiPurchases = await response.json();
        setPurchases(apiPurchases);
        await AsyncStorage.setItem('purchases', JSON.stringify(apiPurchases));
      } else {
        const errorText = await response.text();
        console.error('Erreur serveur:', response.status, errorText);
        // Fallback aux données locales
        const savedPurchases = await AsyncStorage.getItem('purchases');
        if (savedPurchases) {
          setPurchases(JSON.parse(savedPurchases));
        }
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
        Alert.alert('Permission refusée', 'Impossible d\'accéder à la localisation sans permission');
        setIsGettingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      updateFormData('latitude', location.coords.latitude);
      updateFormData('longitude', location.coords.longitude);
      
      // Feedback visuel sans alerte intrusive
      setIsGettingLocation(false);
    } catch (error) {
      console.error('Erreur de géolocalisation:', error);
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
      updateFormData('photo', result.assets[0].uri);
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
      updateFormData('photo', result.assets[0].uri);
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
    const { first_name, last_name, zone, amount, phone, base, pushcard_type } = formData;
    
    if (!first_name.trim()) {
      Alert.alert('Erreur', 'Le prénom est requis');
      return false;
    }
    
    if (!last_name.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return false;
    }
    
    if (!zone.trim()) {
      Alert.alert('Erreur', 'La zone de vente est requise');
      return false;
    }
    
    if (!amount.trim()) {
      Alert.alert('Erreur', 'Le montant est requis');
      return false;
    }
    
    if (isNaN(parseFloat(amount))) {
      Alert.alert('Erreur', 'Le montant doit être un nombre valide');
      return false;
    }

    if (!phone.trim()) {
      Alert.alert('Erreur', 'Le numéro de téléphone est requis');
      return false;
    }

    if (!base.trim()) {
      Alert.alert('Erreur', 'La base est requise');
      return false;
    }

    if (!pushcard_type.trim()) {
      Alert.alert('Erreur', 'Le type de pushcard est requis');
      return false;
    }
    
    return true;
  };

  const savePurchase = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      formDataToSend.append('first_name', formData.first_name.trim());
      formDataToSend.append('last_name', formData.last_name.trim());
      formDataToSend.append('zone', formData.zone.trim());
      formDataToSend.append('amount', parseFloat(formData.amount));
      formDataToSend.append('phone', formData.phone.trim());
      formDataToSend.append('base', formData.base.trim());
      formDataToSend.append('pushcard_type', formData.pushcard_type.trim());
      formDataToSend.append('purchase_date', new Date().toISOString());
      
      if (formData.latitude && formData.longitude) {
        formDataToSend.append('latitude', formData.latitude.toString());
        formDataToSend.append('longitude', formData.longitude.toString());
      }
      
      if (formData.photo) {
        formDataToSend.append('photo', {
          uri: formData.photo,
          name: 'purchase_photo.jpg',
          type: 'image/jpeg',
        });
      }
      
      const headers = await getAuthHeader();
      headers['Content-Type'] = 'multipart/form-data';
      
      const response = await fetch('https://backendsupply.onrender.com/api/purchases/', {
        method: 'POST',
        body: formDataToSend,
        headers: headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur serveur: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      
      const updatedPurchases = [responseData, ...purchases];
      await AsyncStorage.setItem('purchases', JSON.stringify(updatedPurchases));
      
      setPurchases(updatedPurchases);
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
      
      // Feedback visuel de succès
      setIsLoading(false);
    } catch (error) {
      console.error('Erreur savePurchase:', error);
      Alert.alert(
        'Erreur', 
        error.message || 'Erreur lors de l\'enregistrement de l\'achat'
      );
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

  const filteredPurchases = purchases
    .filter(purchase => {
      const searchLower = searchQuery.toLowerCase();
      return (
        purchase.first_name.toLowerCase().includes(searchLower) ||
        purchase.last_name.toLowerCase().includes(searchLower) ||
        purchase.phone.includes(searchQuery) ||
        purchase.zone.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.purchase_date) - new Date(a.purchase_date);
      } else if (sortBy === 'amount') {
        return b.amount - a.amount;
      } else if (sortBy === 'name') {
        return a.first_name.localeCompare(b.first_name);
      }
      return 0;
    });

  const openPurchaseDetails = (purchase) => {
    setSelectedPurchase(purchase);
    setShowPurchaseModal(true);
  };

  const totalAmount = purchases.reduce((sum, purchase) => sum + parseFloat(purchase.amount), 0);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header avec statistiques */}
        {/* <Animated.View 
          style={[styles.statsCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{purchases.length}</Text>
              <Text style={styles.statLabel}>Achats</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatAmount(totalAmount)}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {purchases.length > 0 ? formatAmount(totalAmount / purchases.length) : formatAmount(0)}
              </Text>
              <Text style={styles.statLabel}>Moyenne</Text>
            </View>
          </View>
        </Animated.View> */}

        {/* Formulaire repliable */}
        <Animated.View 
          style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <TouchableOpacity 
            style={styles.formHeader}
            onPress={() => setShowFilters(!showFilters)}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="person-add" size={24} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Nouvel Pushcard</Text>
            </View>
            <Ionicons 
              name={showFilters ? "chevron-up" : "chevron-down"} 
              size={24} 
              color={COLORS.textLight} 
            />
          </TouchableOpacity>
          
          {showFilters && (
            <View>
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.label}>Prénom *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.first_name}
                    onChangeText={(value) => updateFormData('first_name', value)}
                    placeholder="Prénom"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.label}>Nom *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.last_name}
                    onChangeText={(value) => updateFormData('last_name', value)}
                    placeholder="Nom"
                  />
                </View>
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
                <Text style={styles.label}>Type Pushcard *</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity 
                    style={[
                      styles.radioButton, 
                      formData.pushcard_type === 'pushcard' && styles.radioButtonSelected
                    ]}
                    onPress={() => updateFormData('pushcard_type', 'pushcard')}
                  >
                    <Text style={[
                      styles.radioText,
                      formData.pushcard_type === 'pushcard' && styles.radioTextSelected
                    ]}>
                      Pushcard
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.radioButton, 
                      formData.pushcard_type === 'TopTop' && styles.radioButtonSelected
                    ]}
                    onPress={() => updateFormData('pushcard_type', 'TopTop',)}
                  >
                    <Text style={[
                      styles.radioText,
                      formData.pushcard_type === 'TopTop' && styles.radioTextSelected
                    ]}>
                      TopTop
                    </Text>
                  </TouchableOpacity>
                                    <TouchableOpacity 
                    style={[
                      styles.radioButton, 
                      formData.pushcard_type === 'Owner' && styles.radioButtonSelected
                    ]}
                    onPress={() => updateFormData('pushcard_type', 'Owner')}
                  >
                    <Text style={[
                      styles.radioText,
                      formData.pushcard_type === 'pushcard' && styles.radioTextSelected
                    ]}>
                      Owner
                    </Text>
                  </TouchableOpacity>
                                    <TouchableOpacity 
                    style={[
                      styles.radioButton, 
                      formData.pushcard_type === 'pushcard' && styles.radioButtonSelected
                    ]}
                    onPress={() => updateFormData('pushcard_type', 'pushcard')}
                  >
                    <Text style={[
                      styles.radioText,
                      formData.pushcard_type === 'pushcard' && styles.radioTextSelected
                    ]}>
                      Pushcard
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Base *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.base}
                  onChangeText={(value) => updateFormData('base', value)}
                  placeholder="Ex: Base principale"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Zone de vente *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.zone}
                  onChangeText={(value) => updateFormData('zone', value)}
                  placeholder="Ex: Cocody, Yopougon..."
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Chiffre d'affaire (FCFA) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.amount}
                  onChangeText={(value) => updateFormData('amount', value)}
                  placeholder="0"
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
                      <Ionicons 
                        name="location" 
                        size={20} 
                        color={formData.latitude ? COLORS.success : COLORS.primary} 
                      />
                    )}
                    <Text style={[
                      styles.locationButtonText,
                      isGettingLocation && styles.locationButtonTextDisabled
                    ]}>
                      {formData.latitude ? 'Localisation enregistrée' : 'Obtenir ma position'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Photo (optionnelle)</Text>
                <TouchableOpacity style={styles.photoButton} onPress={showImageOptions}>
                  {formData.photo ? (
                    <View style={styles.photoContainer}>
                      <Image source={{ uri: formData.photo }} style={styles.photoPreview} />
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
                onPress={savePurchase}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.surface} />
                ) : (
                  <>
                    <Text style={styles.saveButtonText}>Enregistrer un Pushcard</Text>
                    <Ionicons name="save-outline" size={20} color={COLORS.surface} style={styles.buttonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Liste des achats avec recherche et filtres */}
        <Animated.View 
          style={[styles.clientsCard, { opacity: fadeAnim }]}
        >
          <View style={styles.listHeader}>
            <View style={styles.cardHeader}>
              <Ionicons name="receipt" size={24} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Pushcard ({purchases.length})</Text>
            </View>
            
            <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
              <Ionicons name="filter" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un achat..."
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
            <TouchableOpacity 
              style={[styles.filterTab, sortBy === 'date' && styles.filterTabActive]}
              onPress={() => setSortBy('date')}
            >
              <Text style={[styles.filterTabText, sortBy === 'date' && styles.filterTabTextActive]}>
                Récent
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterTab, sortBy === 'amount' && styles.filterTabActive]}
              onPress={() => setSortBy('amount')}
            >
              <Text style={[styles.filterTabText, sortBy === 'amount' && styles.filterTabTextActive]}>
                Montant
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterTab, sortBy === 'name' && styles.filterTabActive]}
              onPress={() => setSortBy('name')}
            >
              <Text style={[styles.filterTabText, sortBy === 'name' && styles.filterTabTextActive]}>
                Nom
              </Text>
            </TouchableOpacity>
          </View>
          
          {filteredPurchases.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'Aucun résultat pour votre recherche' : 'Aucun achat enregistré'}
              </Text>
            </View>
          ) : (
            filteredPurchases.map((purchase, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.clientItem}
                onPress={() => openPurchaseDetails(purchase)}
              >
                <View style={styles.clientAvatar}>
                  <Text style={styles.avatarText}>
                    {purchase.first_name.charAt(0)}{purchase.last_name.charAt(0)}
                  </Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {purchase.first_name} {purchase.last_name}
                  </Text>
                  <Text style={styles.clientDetail}>{purchase.phone}</Text>
                  <Text style={styles.clientZone}>{purchase.zone}</Text>
                  <Text style={styles.clientDate}>{formatDate(purchase.purchase_date)}</Text>
                </View>
                <View style={styles.clientAmount}>
                  <Text style={styles.amountText}>{formatAmount(purchase.amount)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal de détail d'achat */}
      <Modal
        visible={showPurchaseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails de l'achat</Text>
              <TouchableOpacity onPress={() => setShowPurchaseModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {selectedPurchase && (
              <ScrollView>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Client:</Text>
                  <Text style={styles.detailValue}>
                    {selectedPurchase.first_name} {selectedPurchase.last_name}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Téléphone:</Text>
                  <Text style={styles.detailValue}>{selectedPurchase.phone}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type:</Text>
                  <Text style={styles.detailValue}>{selectedPurchase.pushcard_type}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Base:</Text>
                  <Text style={styles.detailValue}>{selectedPurchase.base}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Zone:</Text>
                  <Text style={styles.detailValue}>{selectedPurchase.zone}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Montant:</Text>
                  <Text style={[styles.detailValue, styles.amountHighlight]}>
                    {formatAmount(selectedPurchase.amount)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedPurchase.purchase_date)}</Text>
                </View>
                
                {selectedPurchase.latitude && selectedPurchase.longitude && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Localisation:</Text>
                    <Text style={styles.detailValue}>
                      {selectedPurchase.latitude.toFixed(6)}, {selectedPurchase.longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
                
                {selectedPurchase.photo && (
                  <View style={styles.photoDetailContainer}>
                    <Text style={styles.detailLabel}>Photo:</Text>
                    <Image 
                      source={{ uri: selectedPurchase.photo }} 
                      style={styles.detailPhoto}
                    />
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 12,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginRight: 8,
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
    paddingVertical: 12,
    fontSize: 16,
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
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  radioText: {
    color: COLORS.text,
    fontWeight: '500',
  },
  radioTextSelected: {
    color: COLORS.surface,
  },
  locationContainer: {
    marginTop: 8,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  locationButtonDisabled: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  locationButtonText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontWeight: '500',
  },
  locationButtonTextDisabled: {
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
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8,
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
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    color: COLORS.text,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: COLORS.surface,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    color: COLORS.textLight,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  clientDetail: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  clientZone: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  clientDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  clientAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    flex: 2,
    textAlign: 'right',
  },
  amountHighlight: {
    color: COLORS.success,
    fontWeight: 'bold',
  },
  photoDetailContainer: {
    marginTop: 16,
  },
  detailPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
});