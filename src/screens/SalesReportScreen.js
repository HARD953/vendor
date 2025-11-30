import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

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
const API_BASE_URL = "https://api.pushtrack360.com/api";

export default function SalesReportScreen() {
  const [salesData, setSalesData] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    purchase_count: 0,
    sales_count: 0,
    total_amounts: 0,
    total_quantitys: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('today');
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadAllData();
    animateEntrance();
  }, []);

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

  const loadSalesData = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/sales/`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setSalesData(data);
      }
    } catch (error) {
      console.log('Erreur lors du chargement des ventes:', error);
    }
  };

  const loadSalesSummary = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/sales/summary/`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      
      setSummary({
        purchase_count: data.purchase_count || 0,
        sales_count: data.sales_count || 0,
        total_amounts: data.total_amounts || 0,
        total_quantitys: data.total_quantitys || 0
      });
    } catch (error) {
      console.log('Erreur lors du chargement du résumé des ventes:', error);
      throw error;
    }
  };

  const loadClientsData = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/purchases/`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.log('Erreur lors du chargement des clients:', error);
    }
  };

  const loadProductsData = async () => {
    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_BASE_URL}/vendor-activities/`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.log('Erreur lors du chargement des produits:', error);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadSalesData(),
        loadSalesSummary(),
        loadClientsData(),
        loadProductsData()
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    setIsRefreshing(false);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(price);
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

  // Calculs des statistiques avancées
  const getSalesStats = () => {
    const totalRevenue = salesData.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
    const totalQuantity = salesData.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
    const averageSaleValue = salesData.length > 0 ? totalRevenue / salesData.length : 0;
    
    // Ventes par heure
    const hourlySales = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      sales: 0,
      revenue: 0
    }));
    
    salesData.forEach(sale => {
      const hour = new Date(sale.created_at).getHours();
      hourlySales[hour].sales += 1;
      hourlySales[hour].revenue += parseFloat(sale.total_amount || 0);
    });

    return {
      totalRevenue,
      totalQuantity,
      averageSaleValue,
      totalSales: salesData.length,
      hourlySales
    };
  };

  const getClientStats = () => {
    const totalClients = clients.length;
    const totalClientRevenue = clients.reduce((sum, client) => sum + parseFloat(client.amount || 0), 0);
    const averageClientValue = totalClients > 0 ? totalClientRevenue / totalClients : 0;
    
    // Grouper par zone
    const zoneStats = clients.reduce((acc, client) => {
      const zone = client.zone || 'Non spécifié';
      if (!acc[zone]) {
        acc[zone] = { count: 0, revenue: 0 };
      }
      acc[zone].count += 1;
      acc[zone].revenue += parseFloat(client.amount || 0);
      return acc;
    }, {});

    // Top clients
    const topClients = [...clients]
      .sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0))
      .slice(0, 5);

    return {
      totalClients,
      totalClientRevenue,
      averageClientValue,
      zoneStats: Object.entries(zoneStats).map(([zone, data]) => ({
        zone,
        ...data
      })),
      topClients
    };
  };

  const getProductStats = () => {
    let allProducts = [];
    
    // Extraire tous les produits des activités
    products.forEach(activity => {
      if (activity.order_items) {
        activity.order_items.forEach(item => {
          if (item.product_variant) {
            allProducts.push({
              ...item,
              soldQuantity: activity.quantity_sales || 0,
              assignedQuantity: activity.quantity_assignes || 0
            });
          }
        });
      }
    });

    const totalAssigned = allProducts.reduce((sum, product) => sum + (product.assignedQuantity || 0), 0);
    const totalSold = allProducts.reduce((sum, product) => sum + (product.soldQuantity || 0), 0);
    const totalProductRevenue = salesData.reduce((sum, sale) => sum + parseFloat(sale.total_amount || 0), 0);
    const remainingStock = totalAssigned - totalSold;
    const sellRate = totalAssigned > 0 ? (totalSold / totalAssigned) * 100 : 0;

    // Top produits vendus
    const topProducts = allProducts
      .filter(product => product.soldQuantity > 0)
      .sort((a, b) => b.soldQuantity - a.soldQuantity)
      .slice(0, 5);

    return {
      totalAssigned,
      totalSold,
      totalProductRevenue,
      remainingStock,
      sellRate,
      topProducts
    };
  };

  const salesStats = getSalesStats();
  const clientStats = getClientStats();
  const productStats = getProductStats();

  // Données pour les graphiques
  const revenueChartData = salesStats.hourlySales.map((hour, index) => ({
    value: hour.revenue,
    label: `${hour.hour}h`,
    frontColor: hour.revenue > 0 ? '#4CAF50' : '#e0e0e0',
    gradientColor: hour.revenue > 0 ? '#81C784' : '#e0e0e0',
  }));

  const zoneChartData = clientStats.zoneStats.slice(0, 6).map((zone, index) => ({
    value: zone.revenue,
    label: zone.zone.substring(0, 8),
    frontColor: ['#667eea', '#764ba2', '#f093fb', '#4CAF50', '#FF9800', '#F44336'][index],
  }));

  const productChartData = productStats.topProducts.map((product, index) => ({
    value: product.soldQuantity,
    label: product.product_name?.substring(0, 6) || 'Prod',
    frontColor: ['#667eea', '#764ba2', '#f093fb', '#4CAF50', '#FF9800'][index],
  }));

  const renderOverviewTab = () => (
    <Animated.View 
      style={[
        styles.tabContent,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      {/* Cartes de statistiques principales */}
      <View style={styles.statsGrid}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={[styles.statCard, styles.mainStatCard]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statIconContainer}>
            <Ionicons name="trending-up" size={32} color="#FFF" />
          </View>
          <Text style={styles.mainStatValue}>{formatPrice(salesStats.totalRevenue)}</Text>
          <Text style={styles.mainStatLabel}>Chiffre d'affaires total</Text>
          <Text style={styles.statSubtext}>{salesStats.totalSales} ventes</Text>
        </LinearGradient>

        <View style={styles.statsSubGrid}>
          <View style={[styles.statCard, styles.subStatCard]}>
            <Ionicons name="people" size={24} color="#667eea" />
            <Text style={styles.subStatValue}>{clientStats.totalClients}</Text>
            <Text style={styles.subStatLabel}>Clients</Text>
          </View>
          
          <View style={[styles.statCard, styles.subStatCard]}>
            <Ionicons name="cart" size={24} color="#4CAF50" />
            <Text style={styles.subStatValue}>{productStats.totalSold}</Text>
            <Text style={styles.subStatLabel}>Produits vendus</Text>
          </View>
          
          <View style={[styles.statCard, styles.subStatCard]}>
            <Ionicons name="cash" size={24} color="#FF9800" />
            <Text style={styles.subStatValue}>{formatPrice(salesStats.averageSaleValue)}</Text>
            <Text style={styles.subStatLabel}>Panier moyen</Text>
          </View>
          
          <View style={[styles.statCard, styles.subStatCard]}>
            <Ionicons name="speedometer" size={24} color="#F44336" />
            <Text style={styles.subStatValue}>{Math.round(productStats.sellRate)}%</Text>
            <Text style={styles.subStatLabel}>Taux de vente</Text>
          </View>
        </View>
      </View>

      {/* Graphiques principaux */}
      <View style={styles.chartsContainer}>
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Ionicons name="bar-chart" size={24} color="#667eea" />
            <Text style={styles.chartTitle}>Revenus par heure</Text>
          </View>
          <BarChart
            data={revenueChartData}
            barWidth={22}
            spacing={24}
            roundedTop
            roundedBottom
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            noOfSections={4}
            maxValue={Math.max(...revenueChartData.map(d => d.value)) * 1.2}
            height={160}
            initialSpacing={10}
            yAxisTextStyle={{ color: '#718096', fontSize: 12 }}
            xAxisLabelTextStyle={{ color: '#718096', fontSize: 10 }}
          />
        </View>

        <View style={styles.chartRow}>
          <View style={[styles.chartCard, styles.halfChart]}>
            <View style={styles.chartHeader}>
              <Ionicons name="pie-chart" size={20} color="#764ba2" />
              <Text style={styles.chartTitle}>Zones</Text>
            </View>
            <PieChart
              data={zoneChartData}
              donut
              showGradient
              sectionAutoFocus
              radius={70}
              innerRadius={50}
              innerCircleColor={COLORS.background}
              centerLabelComponent={() => (
                <View style={styles.pieChartCenter}>
                  <Text style={styles.pieChartCenterText}>
                    {clientStats.zoneStats.length}
                  </Text>
                  <Text style={styles.pieChartCenterSubtext}>Zones</Text>
                </View>
              )}
            />
          </View>

          <View style={[styles.chartCard, styles.halfChart]}>
            <View style={styles.chartHeader}>
              <Ionicons name="star" size={20} color="#f093fb" />
              <Text style={styles.chartTitle}>Top Produits</Text>
            </View>
            <BarChart
              data={productChartData}
              barWidth={16}
              spacing={20}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              noOfSections={3}
              height={140}
              initialSpacing={10}
              yAxisTextStyle={{ color: '#718096', fontSize: 10 }}
            />
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderClientsTab = () => (
    <Animated.View 
      style={[
        styles.tabContent,
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.insightCard]}>
          <Ionicons name="people" size={32} color="#667eea" />
          <Text style={styles.insightValue}>{clientStats.totalClients}</Text>
          <Text style={styles.insightLabel}>Clients total</Text>
        </View>
        
        <View style={[styles.statCard, styles.insightCard]}>
          <Ionicons name="trending-up" size={32} color="#4CAF50" />
          <Text style={styles.insightValue}>{formatPrice(clientStats.totalClientRevenue)}</Text>
          <Text style={styles.insightLabel}>Revenus clients</Text>
        </View>
        
        <View style={[styles.statCard, styles.insightCard]}>
          <Ionicons name="calculator" size={32} color="#FF9800" />
          <Text style={styles.insightValue}>{formatPrice(clientStats.averageClientValue)}</Text>
          <Text style={styles.insightLabel}>Panier moyen</Text>
        </View>
      </View>

      {clientStats.zoneStats.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Ionicons name="map" size={24} color="#667eea" />
            <Text style={styles.chartTitle}>Performance par zone</Text>
          </View>
          <BarChart
            data={zoneChartData}
            barWidth={28}
            spacing={20}
            roundedTop
            roundedBottom
            showGradient
            gradientColor="#667eea"
            frontColor="#667eea"
            height={200}
            initialSpacing={10}
            yAxisTextStyle={{ color: '#718096', fontSize: 12 }}
            xAxisLabelTextStyle={{ color: '#718096', fontSize: 10 }}
          />
        </View>
      )}

      {clientStats.topClients.length > 0 && (
        <View style={styles.listCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="trophy" size={24} color="#FFD700" />
            <Text style={styles.cardTitle}>Top Clients</Text>
          </View>
          {clientStats.topClients.map((client, index) => (
            <View key={client.id} style={styles.listItem}>
              <View style={styles.rankContainer}>
                <View style={[
                  styles.rankBadge,
                  index === 0 && styles.firstRank,
                  index === 1 && styles.secondRank,
                  index === 2 && styles.thirdRank
                ]}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.full_name}</Text>
                  <Text style={styles.clientZone}>{client.zone}</Text>
                </View>
              </View>
              <View style={styles.clientStats}>
                <Text style={styles.clientAmount}>{formatPrice(client.amount)}</Text>
                <Text style={styles.clientPhone}>{client.phone}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );

  const renderProductsTab = () => (
    <Animated.View 
      style={[
        styles.tabContent,
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.insightCard]}>
          <Ionicons name="cube" size={32} color="#667eea" />
          <Text style={styles.insightValue}>{productStats.totalAssigned}</Text>
          <Text style={styles.insightLabel}>Stock assigné</Text>
        </View>
        
        <View style={[styles.statCard, styles.insightCard]}>
          <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
          <Text style={styles.insightValue}>{productStats.totalSold}</Text>
          <Text style={styles.insightLabel}>Vendus</Text>
        </View>
        
        <View style={[styles.statCard, styles.insightCard]}>
          <Ionicons name="time" size={32} color="#FF9800" />
          <Text style={styles.insightValue}>{productStats.remainingStock}</Text>
          <Text style={styles.insightLabel}>Restants</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Ionicons name="bar-chart" size={24} color="#764ba2" />
          <Text style={styles.chartTitle}>Top Produits Vendus</Text>
        </View>
        <BarChart
          data={productChartData}
          barWidth={32}
          spacing={24}
          roundedTop
          roundedBottom
          showGradient
          gradientColor="#764ba2"
          frontColor="#764ba2"
          height={200}
          initialSpacing={10}
          yAxisTextStyle={{ color: '#718096', fontSize: 12 }}
          xAxisLabelTextStyle={{ color: '#718096', fontSize: 10 }}
        />
      </View>

      {productStats.topProducts.length > 0 && (
        <View style={styles.listCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="star" size={24} color="#FFD700" />
            <Text style={styles.cardTitle}>Produits Performants</Text>
          </View>
          {productStats.topProducts.map((product, index) => (
            <View key={product.product_variant?.id || index} style={styles.listItem}>
              <View style={styles.productInfo}>
                <View style={styles.productImagePlaceholder}>
                  <Ionicons name="cube" size={20} color="#667eea" />
                </View>
                <View style={styles.productDetails}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.product_name}
                  </Text>
                  <Text style={styles.productSku}>
                    {product.product_variant?.product?.sku}
                  </Text>
                </View>
              </View>
              <View style={styles.productStats}>
                <Text style={styles.productSold}>{product.soldQuantity} vendus</Text>
                <Text style={styles.productRevenue}>
                  {formatPrice((product.soldQuantity || 0) * (product.product_variant?.price || 0))}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des rapports...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête avec dégradé */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>📊 Rapports de Vente</Text>
            <Text style={styles.headerSubtitle}>Analyse complète de vos performances</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Navigation par onglets */}
        <View style={styles.tabContainer}>
          {[
            { key: 'overview', label: 'Aperçu', icon: 'grid' },
            { key: 'clients', label: 'Clients', icon: 'people' },
            { key: 'products', label: 'Produits', icon: 'cube' }
          ].map((tab) => (
            <TouchableOpacity 
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.activeTab
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons 
                name={tab.icon} 
                size={20} 
                color={activeTab === tab.key ? '#FFF' : 'rgba(255,255,255,0.7)'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

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
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'clients' && renderClientsTab()}
        {activeTab === 'products' && renderProductsTab()}

        {/* Pied de page */}
        <View style={styles.footer}>
          <Ionicons name="information-circle" size={16} color={COLORS.textLight} />
          <Text style={styles.footerText}>
            Dernière mise à jour: {formatDate(new Date().toISOString())}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  statsGrid: {
    marginBottom: 20,
  },
  mainStatCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  statIconContainer: {
    marginBottom: 16,
  },
  mainStatValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  mainStatLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statsSubGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subStatCard: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  subStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  subStatLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  chartsContainer: {
    marginBottom: 20,
  },
  chartCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfChart: {
    width: '48%',
  },
  pieChartCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartCenterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  pieChartCenterSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  insightCard: {
    width: '32%',
    alignItems: 'center',
  },
  insightValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  listCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.textLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  firstRank: {
    backgroundColor: '#FFD700',
  },
  secondRank: {
    backgroundColor: '#C0C0C0',
  },
  thirdRank: {
    backgroundColor: '#CD7F32',
  },
  rankText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  clientZone: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  clientStats: {
    alignItems: 'flex-end',
  },
  clientAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  productSku: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  productStats: {
    alignItems: 'flex-end',
  },
  productSold: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 8,
  },
});