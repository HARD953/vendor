import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  Dimensions,
  Animated,
  Easing,
  SectionList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

// Couleurs
const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#f093fb',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  background: '#f8f9fa',
  surface: '#FFFFFF',
  text: '#2D3748',
  textLight: '#718096',
  border: '#E2E8F0'
};

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'https://api.pushtrack360.com/api';

export default function ProductsScreenPOS() {
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState({ 
    total_products: 0, 
    total_amount: 0,
    remaining_products: 0,
    sold_amount: 0,
    sold_quantity: 0,
    remaining_amount: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saleQuantity, setSaleQuantity] = useState('');
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [selectedVendorActivity, setSelectedVendorActivity] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [saleProcessing, setSaleProcessing] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerScrollAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    animateEntrance();
  }, []);

  useEffect(() => {
    if (selectedProduct && saleQuantity) {
      const qty = parseInt(saleQuantity);
      if (!isNaN(qty) && qty > 0) {
        const price = parseFloat(selectedProduct.product_variant?.price || 0);
        setTotalAmount(qty * price);
      } else {
        setTotalAmount(0);
      }
    } else {
      setTotalAmount(0);
    }
  }, [saleQuantity, selectedProduct]);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer => 
        customer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer?.zone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer?.phone?.includes(searchQuery)
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
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

  const getAuthHeader = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    };
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusée',
          'La géolocalisation est nécessaire pour enregistrer les ventes avec précision.'
        );
        return null;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000
      });

      const { latitude, longitude } = location.coords;
      setLocation({ latitude, longitude });
      
      return { latitude, longitude };
    } catch (error) {
      console.log('Erreur de géolocalisation:', error);
      Alert.alert(
        'Géolocalisation',
        'Impossible de récupérer la position. La vente sera enregistrée sans coordonnées GPS.'
      );
      return null;
    } finally {
      setLocationLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadActivities(),
        loadSalesSummary(),
        loadCustomers()
      ]);
    } catch (error) {
      console.log('Erreur lors du chargement des données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/vendor-activities/`, {
        headers
      });
      
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      
      const data = await response.json();
      setActivities(data);
      
      let totalAssignedProducts = 0;
      let totalAssignedAmount = 0;
      
      data.forEach(activity => {
        if (activity.activity_type === 'stock_replenishment') {
          totalAssignedProducts += activity.quantity_assignes || 0;
          totalAssignedAmount += parseFloat(activity.total_amount || 0);
        }
      });
      
      setSummary(prev => ({
        ...prev,
        total_products: totalAssignedProducts,
        total_amount: totalAssignedAmount
      }));
    } catch (error) {
      console.log('Erreur lors du chargement des activités:', error);
      throw error;
    }
  };

  const loadSalesSummary = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/salespos/summary/`, {
        headers
      });
      
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      
      const data = await response.json();
      
      setSummary(prev => ({
        ...prev,
        sold_amount: data.total_revenue || 0,
        sold_quantity: data.total_quantity_assigne || 0,
        remaining_products: data.total_quantite_restant || 0,
        vendu: (data.total_quantity_assigne || 0) - (data.total_quantite_restant || 0),
        remaining_amount: prev.total_amount - (data.total_revenue || 0)
      }));
    } catch (error) {
      console.log('Erreur lors du chargement du résumé des ventes:', error);
      throw error;
    }
  };

  const loadCustomers = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/points-vente/`, {
        headers
      });
      
      if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
      
      const data = await response.json();
      setCustomers(data);
      setFilteredCustomers(data);
    } catch (error) {
      console.log('Erreur lors du chargement des clients:', error);
      throw error;
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const getAvailableStock = (product) => {
    if (!product?.product_variant) return 0;
    
    const vendorActivity = activities.find(activity => 
      activity?.order_items?.some(item => 
        item?.product_variant?.id === product.product_variant.id
      )
    );
    
    if (!vendorActivity) return 0;
    
    return (vendorActivity.quantity_assignes || 0) - (vendorActivity.quantity_sales || 0);
  };

  const handleSalePress = (product) => {
    const availableQuantity = getAvailableStock(product);
    
    if (availableQuantity <= 0) {
      Alert.alert('Stock épuisé', 'Plus de stock disponible pour ce produit');
      return;
    }
    
    const vendorActivity = activities.find(activity => 
      activity.order_items?.some(item => item.product_variant?.id === product.product_variant?.id)
    );
    
    setSelectedProduct(product);
    setSelectedVendorActivity(vendorActivity);
    setSaleQuantity('');
    setSelectedCustomer(null);
    setTotalAmount(0);
    setSaleModalVisible(true);
  };

  const confirmSale = async () => {
    if (!saleQuantity || isNaN(saleQuantity) || parseInt(saleQuantity) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer une quantité valide');
      return;
    }

    const qty = parseInt(saleQuantity);
    const availableQuantity = getAvailableStock(selectedProduct);
    
    if (qty > availableQuantity) {
      Alert.alert('Erreur', `Quantité supérieure au stock disponible (${availableQuantity} unités)`);
      return;
    }

    if (!selectedCustomer) {
      Alert.alert('Information', 'Veuillez sélectionner un client');
      setCustomerModalVisible(true);
      return;
    }

    if (!selectedVendorActivity) {
      Alert.alert('Erreur', 'Aucune activité de vendeur trouvée pour ce produit');
      return;
    }

    try {
      setSaleProcessing(true);
      
      const locationData = await getCurrentLocation();
      
      const saleData = {
        product_variant: selectedProduct.product_variant.id,
        customer: selectedCustomer.id,
        quantity: qty,
        total_amount: totalAmount.toFixed(2),
        vendor_activity: selectedVendorActivity.id
      };

      if (locationData) {
        saleData.latitude = locationData.latitude;
        saleData.longitude = locationData.longitude;
      }

      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/salespos/`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saleData)
      });

      if (response.ok) {
        Alert.alert(
          '✅ Vente enregistrée', 
          `${qty} unité(s) vendue(s) à ${selectedCustomer.full_name}\nMontant: ${formatPrice(totalAmount)}`,
          [{ text: 'OK', onPress: () => {
            setSaleModalVisible(false);
            loadData();
          }}]
        );
      } else {
        const errorData = await response.json();
        Alert.alert('Erreur', errorData.message || 'Échec de l\'enregistrement de la vente');
      }
    } catch (error) {
      console.log('Erreur lors de l\'enregistrement de la vente:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la vente');
    } finally {
      setSaleProcessing(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(price);
  };

  const getStockStatus = (product) => {
    if (!product?.product_variant) {
      return { status: 'Inconnu', color: '#ccc', icon: 'help-circle', priority: 4 };
    }
    
    const remaining = getAvailableStock(product);
    const minStock = product.product_variant.min_stock || 0;
    
    if (remaining === 0) return { status: 'Épuisé', color: '#ff4757', icon: 'close-circle', priority: 0 };
    if (remaining <= minStock) return { status: 'Stock faible', color: '#ff9f43', icon: 'warning', priority: 1 };
    if (remaining <= minStock * 2) return { status: 'Stock moyen', color: '#2e86de', icon: 'alert-circle', priority: 2 };
    return { status: 'Stock bon', color: '#10ac84', icon: 'checkmark-circle', priority: 3 };
  };

  const getFilteredProducts = () => {
    let allProducts = [];
    
    activities.forEach(activity => {
      if (activity?.order_items) {
        activity.order_items.forEach(item => {
          if (item?.product_variant?.id) {
            const existingProduct = allProducts.find(p => 
              p.product_variant?.id === item.product_variant.id
            );
            if (!existingProduct) {
              allProducts.push(item);
            }
          }
        });
      }
    });
    
    if (searchProductQuery.trim() !== '') {
      allProducts = allProducts.filter(product => 
        product?.product_name?.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
        product?.product_variant?.product?.sku?.toLowerCase().includes(searchProductQuery.toLowerCase())
      );
    }

    if (activeTab !== 'all') {
      allProducts = allProducts.filter(product => {
        const status = getStockStatus(product);
        return (
          (activeTab === 'low' && status.priority <= 1) ||
          (activeTab === 'medium' && status.priority === 2) ||
          (activeTab === 'good' && status.priority === 3)
        );
      });
    }

    return allProducts.sort((a, b) => {
      const statusA = getStockStatus(a);
      const statusB = getStockStatus(b);
      return (statusA?.priority || 0) - (statusB?.priority || 0);
    });
  };

  const getProductSections = () => {
    const products = getFilteredProducts();
    const sections = [
      { title: 'Stock Critique', data: [], color: '#ff4757', icon: 'close-circle' },
      { title: 'Stock Faible', data: [], color: '#ff9f43', icon: 'warning' },
      { title: 'Stock Moyen', data: [], color: '#2e86de', icon: 'alert-circle' },
      { title: 'Stock Bon', data: [], color: '#10ac84', icon: 'checkmark-circle' }
    ];

    products.forEach(product => {
      const status = getStockStatus(product);
      if (status.priority === 0) sections[0].data.push(product);
      else if (status.priority === 1) sections[1].data.push(product);
      else if (status.priority === 2) sections[2].data.push(product);
      else sections[3].data.push(product);
    });

    return sections.filter(section => section.data.length > 0);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des produits...</Text>
      </View>
    );
  }

  const filteredProducts = getFilteredProducts();
  const productSections = getProductSections();

  return (
    <View style={styles.container}>
      {/* Header avec dégradé */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>📦 Inventaire</Text>
              <Text style={styles.headerSubtitle}>Gestion de votre stock en temps réel</Text>
            </View>
            <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un produit..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={searchProductQuery}
              onChangeText={setSearchProductQuery}
            />
            {searchProductQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchProductQuery('')}>
                <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Cartes de statistiques */}
        <Animated.View 
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.totalCard]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="cube" size={24} color="#667eea" />
              </View>
              <Text style={styles.statNumber}>{summary.sold_quantity}</Text>
              <Text style={styles.statLabel}>Total Stock</Text>
            </View>

            <View style={[styles.statCard, styles.soldCard]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="trending-up" size={24} color="#10ac84" />
              </View>
              <Text style={styles.statNumber}>{summary.vendu}</Text>
              <Text style={styles.statLabel}>Vendus</Text>
            </View>

            <View style={[styles.statCard, styles.remainingCard]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="time" size={24} color="#ff9f43" />
              </View>
              <Text style={styles.statNumber}>{summary.remaining_products}</Text>
              <Text style={styles.statLabel}>Restants</Text>
            </View>
          </View>

          {/* Carte de performance */}
          <View style={styles.performanceCard}>
            <View style={styles.performanceHeader}>
              <Text style={styles.performanceTitle}>Performance des ventes</Text>
              <Text style={styles.performanceValue}>
                {summary.sold_quantity > 0 ? Math.round((summary.vendu / summary.sold_quantity) * 100) : 0}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${summary.sold_quantity > 0 ? (summary.vendu / summary.sold_quantity) * 100 : 0}%`,
                  }
                ]}
              />
            </View>
            <View style={styles.performanceFooter}>
              <Text style={styles.performanceAmount}>{formatPrice(summary.sold_amount)}</Text>
              <Text style={styles.performanceLabel}>Chiffre d'affaires</Text>
            </View>
          </View>
        </Animated.View>

        {/* Filtres par statut */}
        <Animated.View 
          style={[
            styles.filterSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={styles.sectionTitle}>Filtrer par statut</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {[
              { key: 'all', label: 'Tous', icon: 'grid' },
              { key: 'low', label: 'Faible', icon: 'warning', color: '#ff9f43' },
              { key: 'medium', label: 'Moyen', icon: 'alert-circle', color: '#2e86de' },
              { key: 'good', label: 'Bon', icon: 'checkmark-circle', color: '#10ac84' }
            ].map((filter) => (
              <TouchableOpacity 
                key={filter.key}
                style={[
                  styles.filterButton,
                  activeTab === filter.key && [styles.filterButtonActive, { backgroundColor: filter.color || COLORS.primary }]
                ]}
                onPress={() => setActiveTab(filter.key)}
              >
                <Ionicons 
                  name={filter.icon} 
                  size={18} 
                  color={activeTab === filter.key ? '#FFF' : (filter.color || COLORS.textLight)} 
                />
                <Text style={[
                  styles.filterText,
                  activeTab === filter.key && styles.filterTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Liste des produits */}
        <Animated.View 
          style={[
            styles.productsSection,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produits ({filteredProducts.length})</Text>
            <Text style={styles.sectionSubtitle}>Classés par niveau de stock</Text>
          </View>

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#e0e0e0" />
              <Text style={styles.emptyStateTitle}>Aucun produit trouvé</Text>
              <Text style={styles.emptyStateSubtext}>Ajustez vos filtres ou votre recherche</Text>
            </View>
          ) : (
            <SectionList
              sections={productSections}
              keyExtractor={(item) => item.product_variant.id.toString()}
              renderSectionHeader={({ section }) => (
                <View style={[styles.sectionHeaderCard, { borderLeftColor: section.color }]}>
                  <View style={styles.sectionHeaderContent}>
                    <Ionicons name={section.icon} size={20} color={section.color} />
                    <Text style={[styles.sectionHeaderText, { color: section.color }]}>
                      {section.title}
                    </Text>
                    <View style={[styles.sectionCountBadge, { backgroundColor: section.color }]}>
                      <Text style={styles.sectionCountText}>{section.data.length}</Text>
                    </View>
                  </View>
                </View>
              )}
              renderItem={({ item: product }) => {
                const stockInfo = getStockStatus(product);
                const remaining = getAvailableStock(product);
                const progressPercentage = Math.min(100, (remaining / (product.product_variant.max_stock || 100)) * 100);
                
                return (
                  <TouchableOpacity
                    style={styles.productCard}
                    onPress={() => handleSalePress(product)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.productHeader}>
                      <View style={styles.productImageContainer}>
                        {product.product_variant.image ? (
                          <Image 
                            source={{ uri: product.product_variant.image }} 
                            style={styles.productImage}
                          />
                        ) : (
                          <View style={styles.productImagePlaceholder}>
                            <Ionicons name="cube" size={24} color="#ccc" />
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.product_name}
                        </Text>
                        <Text style={styles.productSku}>
                          SKU: {product.product_variant.product.sku}
                        </Text>
                        <Text style={styles.productFormat}>
                          {product.product_variant.format.name}
                        </Text>
                      </View>
                      
                      <View style={styles.productPriceContainer}>
                        <Text style={styles.productPrice}>
                          {formatPrice(product.product_variant.price)}
                        </Text>
                        <TouchableOpacity 
                          style={[styles.saleButton, remaining === 0 && styles.saleButtonDisabled]}
                          onPress={() => handleSalePress(product)}
                          disabled={remaining === 0}
                        >
                          <Ionicons 
                            name="cart" 
                            size={20} 
                            color={remaining === 0 ? "#ccc" : "#FFF"} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.productFooter}>
                      <View style={styles.stockInfo}>
                        <View style={styles.stockStat}>
                          <Text style={styles.stockLabel}>Stock restant:</Text>
                          <Text style={[styles.stockValue, { color: stockInfo.color }]}>
                            {remaining} unités
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: stockInfo.color + '20' }]}>
                          <Ionicons name={stockInfo.icon} size={14} color={stockInfo.color} />
                          <Text style={[styles.statusText, { color: stockInfo.color }]}>
                            {stockInfo.status}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${progressPercentage}%`,
                                backgroundColor: stockInfo.color,
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>{Math.round(progressPercentage)}%</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal de vente */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={saleModalVisible}
        onRequestClose={() => setSaleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>🛒 Nouvelle Vente</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setSaleModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </LinearGradient>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Produit sélectionné */}
              <View style={styles.productSummary}>
                <View style={styles.productImageModal}>
                  {selectedProduct?.product_variant?.image ? (
                    <Image 
                      source={{ uri: selectedProduct.product_variant.image }} 
                      style={styles.modalProductImage}
                    />
                  ) : (
                    <View style={styles.modalProductImagePlaceholder}>
                      <Ionicons name="cube" size={32} color="#ccc" />
                    </View>
                  )}
                </View>
                <View style={styles.productInfoModal}>
                  <Text style={styles.productSummaryTitle}>{selectedProduct?.product_name}</Text>
                  <Text style={styles.productSummaryDetail}>
                    {selectedProduct?.product_variant?.format?.name}
                  </Text>
                  <Text style={styles.productSummaryPrice}>
                    {formatPrice(selectedProduct?.product_variant?.price || 0)}/unité
                  </Text>
                  <Text style={styles.productSummaryStock}>
                    Stock disponible: <Text style={{ fontWeight: 'bold', color: getStockStatus(selectedProduct)?.color }}>
                      {getAvailableStock(selectedProduct)} unités
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Formulaire de vente */}
              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quantité à vendre</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={saleQuantity}
                    onChangeText={setSaleQuantity}
                    placeholder="0"
                    placeholderTextColor="#ccc"
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sélectionner un client</Text>
                  <TouchableOpacity 
                    style={styles.customerSelector}
                    onPress={() => setCustomerModalVisible(true)}
                  >
                    {selectedCustomer ? (
                      <View style={styles.selectedCustomer}>
                        <View style={styles.customerAvatarSmall}>
                          <Text style={styles.customerInitials}>
                            {selectedCustomer.name?.split(' ').map(n => n[0]).join('')}
                          </Text>
                        </View>
                        <Text style={styles.customerSelected}>{selectedCustomer.name}</Text>
                      </View>
                    ) : (
                      <Text style={styles.customerPlaceholder}>👤 Choisir un client</Text>
                    )}
                    <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>

                {selectedCustomer && (
                  <View style={styles.customerInfo}>
                    <View style={styles.customerDetailRow}>
                      <Ionicons name="location" size={16} color={COLORS.textLight} />
                      <Text style={styles.customerDetail}>{selectedCustomer.address}</Text>
                    </View>
                    <View style={styles.customerDetailRow}>
                      <Ionicons name="call" size={16} color={COLORS.textLight} />
                      <Text style={styles.customerDetail}>{selectedCustomer.phone}</Text>
                    </View>
                  </View>
                )}

                {/* Montant total */}
                {saleQuantity && !isNaN(parseInt(saleQuantity)) && parseInt(saleQuantity) > 0 && (
                  <View style={styles.totalAmountContainer}>
                    <Text style={styles.totalAmountLabel}>Montant total</Text>
                    <Text style={styles.totalAmountText}>{formatPrice(totalAmount)}</Text>
                  </View>
                )}

                {/* Indicateur de géolocalisation */}
                <View style={styles.locationInfo}>
                  <Ionicons 
                    name={location ? "location" : "location-outline"} 
                    size={20} 
                    color={location ? "#10ac84" : "#ff9f43"} 
                  />
                  <Text style={[styles.locationText, { color: location ? "#10ac84" : "#ff9f43" }]}>
                    {location ? "📍 Position GPS capturée" : "🌍 En attente de géolocalisation"}
                  </Text>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSaleModalVisible(false)}
                disabled={saleProcessing}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton, (!saleQuantity || !selectedCustomer || saleProcessing) && styles.disabledButton]}
                onPress={confirmSale}
                disabled={!saleQuantity || !selectedCustomer || saleProcessing}
              >
                {saleProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Confirmer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de sélection du client */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={customerModalVisible}
        onRequestClose={() => setCustomerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, styles.customerModal]}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>👥 Sélectionner un client</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setCustomerModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </LinearGradient>
            
            <View style={styles.searchContainerModal}>
              <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un client..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.customerItem}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setCustomerModalVisible(false);
                  }}
                >
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerInitials}>
                      {item.name?.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={styles.customerDetails}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <View style={styles.customerMeta}>
                      <View style={styles.customerMetaItem}>
                        <Ionicons name="location" size={14} color={COLORS.textLight} />
                        <Text style={styles.customerZone}>{item.address}</Text>
                      </View>
                      <View style={styles.customerMetaItem}>
                        <Ionicons name="call" size={14} color={COLORS.textLight} />
                        <Text style={styles.customerPhone}>{item.phone}</Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Ionicons name="people" size={48} color="#e0e0e0" />
                  <Text style={styles.emptyListText}>
                    {searchQuery ? 'Aucun client trouvé' : 'Aucun client disponible'}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.text,
    fontSize: 16,
  },
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  refreshButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  soldCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10ac84',
  },
  remainingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9f43',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  performanceCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  performanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  performanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  performanceLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonActive: {
    borderColor: 'transparent',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 6,
  },
  filterTextActive: {
    color: '#FFF',
  },
  productsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  sectionHeaderCard: {
    backgroundColor: '#FFF',
    borderLeftWidth: 4,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  sectionCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionCountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImageContainer: {
    marginRight: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  productFormat: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  productPriceContainer: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 8,
  },
  saleButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saleButtonDisabled: {
    backgroundColor: '#ccc',
  },
  productFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginRight: 4,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    minWidth: 30,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFF',
    borderRadius: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textLight,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  customerModal: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: 400,
  },
  productSummary: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productImageModal: {
    marginRight: 16,
  },
  modalProductImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  modalProductImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfoModal: {
    flex: 1,
    justifyContent: 'center',
  },
  productSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  productSummaryDetail: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 4,
    fontWeight: '500',
  },
  productSummaryPrice: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productSummaryStock: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  customerSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  selectedCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  customerInitials: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  customerSelected: {
    color: COLORS.text,
    fontWeight: '600',
  },
  customerPlaceholder: {
    color: COLORS.textLight,
  },
  customerInfo: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  customerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  totalAmountContainer: {
    padding: 16,
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalAmountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  searchContainerModal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    margin: 16,
    marginBottom: 0,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  customerMeta: {
    flexDirection: 'row',
  },
  customerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  customerZone: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  customerPhone: {
    fontSize: 13,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  emptyList: {
    alignItems: 'center',
    padding: 40,
  },
  emptyListText: {
    textAlign: 'center',
    color: COLORS.textLight,
    marginTop: 12,
    fontSize: 16,
  },
});