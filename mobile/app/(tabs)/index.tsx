import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { Palette } from '@/constants/Colors';
import { useCart } from '@/context/CartContext';

// Built-in fallback products in case database is empty or offline
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'f1',
    name: 'Red Rose Bouquet',
    description: 'A dozen long-stem red roses wrapped in kraft paper and tied with a satin ribbon.',
    price: 1500000,
    image_url: null,
    stock: 25,
    created_at: new Date().toISOString(),
  },
  {
    id: 'f2',
    name: 'Sunflower Bunch',
    description: 'Nine cheerful sunflowers that instantly brighten any room. Locally grown.',
    price: 1200000,
    image_url: null,
    stock: 30,
    created_at: new Date().toISOString(),
  },
  {
    id: 'f3',
    name: 'White Orchid Pot',
    description: 'Elegant potted phalaenopsis orchid in a ceramic pot. Blooms last for weeks.',
    price: 2500000,
    image_url: null,
    stock: 12,
    created_at: new Date().toISOString(),
  },
  {
    id: 'f4',
    name: 'Tulip Mix',
    description: 'Fifteen Dutch tulips in a vibrant mix of pink, yellow and purple.',
    price: 1800000,
    image_url: null,
    stock: 20,
    created_at: new Date().toISOString(),
  },
  {
    id: 'f5',
    name: 'Peace Lily',
    description: 'Low-maintenance peace lily that thrives indoors. Perfect housewarming gift.',
    price: 2000000,
    image_url: null,
    stock: 18,
    created_at: new Date().toISOString(),
  },
  {
    id: 'f6',
    name: 'Succulent Trio',
    description: 'Three assorted succulents in mini artisanal concrete planters.',
    price: 850000,
    image_url: null,
    stock: 40,
    created_at: new Date().toISOString(),
  },
  {
    id: 'f7',
    name: "Baby's Breath Jar",
    description: 'Delicate gypsophila (baby\'s breath) arranged in a glass mason jar.',
    price: 1000000,
    image_url: null,
    stock: 26,
    created_at: new Date().toISOString(),
  },
  {
    id: 'f8',
    name: 'Hydrangea Vase',
    description: 'Two lush hydrangea stems presented in a keepsake glass vase.',
    price: 2200000,
    image_url: null,
    stock: 15,
    created_at: new Date().toISOString(),
  },
];

const CATEGORIES = [
  'All',
  'Bouquets',
  'Plants & Pots',
  'Under ₦20,000',
  'In Stock',
];

export default function ShopScreen() {
  const router = useRouter();
  const { totalItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: true });

      if (error || !data || data.length === 0) {
        setProducts(FALLBACK_PRODUCTS);
      } else {
        setProducts(data as Product[]);
      }
    } catch {
      setProducts(FALLBACK_PRODUCTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // Filter products by search query and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === 'Bouquets') {
        return (
          p.name.toLowerCase().includes('bouquet') ||
          p.name.toLowerCase().includes('bunch') ||
          p.name.toLowerCase().includes('rose') ||
          p.name.toLowerCase().includes('tulip')
        );
      }
      if (selectedCategory === 'Plants & Pots') {
        return (
          p.name.toLowerCase().includes('pot') ||
          p.name.toLowerCase().includes('lily') ||
          p.name.toLowerCase().includes('succulent') ||
          p.name.toLowerCase().includes('plant')
        );
      }
      if (selectedCategory === 'Under ₦20,000') {
        return p.price <= 2000000;
      }
      if (selectedCategory === 'In Stock') {
        return p.stock > 0;
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Palette.canvas} />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>LAGOS, NIGERIA</Text>
          <Text style={styles.brandTitle}>Bloom Market 🌸</Text>
        </View>

        <TouchableOpacity
          style={styles.cartHeaderButton}
          onPress={() => router.push('/(tabs)/cart')}
          activeOpacity={0.7}
        >
          <Ionicons name="bag-handle-outline" size={24} color={Palette.ink.primary} />
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Palette.ink.muted} />
          <TextInput
            placeholder="Search roses, lilies, orchids..."
            placeholderTextColor={Palette.ink.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Palette.ink.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item)}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main Catalog Grid */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Palette.leaf[700]} />
          <Text style={styles.loadingText}>Fetching fresh blooms...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="flower-outline" size={48} color={Palette.sand[400]} />
          <Text style={styles.emptyTitle}>No flowers found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or category filter.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Palette.leaf[700]]}
            />
          }
          renderItem={({ item }) => <ProductCard product={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.leaf[600],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Palette.ink.primary,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  cartHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Palette.bloom[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: Palette.ink.primary,
  },
  categoriesWrapper: {
    marginTop: 14,
    marginBottom: 6,
  },
  categoriesList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  categoryPillActive: {
    backgroundColor: Palette.leaf[700],
    borderColor: Palette.leaf[700],
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.ink.soft,
  },
  categoryPillTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Palette.ink.soft,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.ink.primary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Palette.ink.soft,
    textAlign: 'center',
    marginTop: 4,
  },
});

