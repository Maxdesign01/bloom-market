import { Palette } from "@/constants/Colors";
import { useCart } from "@/context/CartContext";
import { formatNaira } from "@/lib/format";
import { resolveProductImage } from "@/lib/images";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeFromCart, totalKobo, totalItems } =
    useCart();

  const deliveryFeeKobo = totalKobo > 5000000 || totalKobo === 0 ? 0 : 250000; // Free over ₦50k, else ₦2,500
  const grandTotalKobo = totalKobo + deliveryFeeKobo;

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name="basket-outline"
              size={48}
              color={Palette.leaf[600]}
            />
          </View>
          <Text style={styles.emptyTitle}>Your basket is empty</Text>
          <Text style={styles.emptySubtitle}>
            Bring fresh hand-tied stems and botanical warmth to your home today.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push("/")}
            activeOpacity={0.85}
          >
            <Text style={styles.browseButtonText}>Browse fresh blooms</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Basket</Text>
        <Text style={styles.countBadge}>
          {totalItems} stem{totalItems === 1 ? "" : "s"}
        </Text>
      </View>

      {/* Cart Items List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.product.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const imageUri = resolveProductImage(
            item.product.image_url,
            item.product.name,
          );

          return (
            <View style={styles.itemCard}>
              <Image source={{ uri: imageUri }} style={styles.itemImage} />

              <View style={styles.itemDetails}>
                <View style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeFromCart(item.product.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={Palette.bloom[600]}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.itemPrice}>
                  {formatNaira(item.product.price)} each
                </Text>

                <View style={styles.quantityContainer}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() =>
                      updateQuantity(item.product.id, item.quantity - 1)
                    }
                  >
                    <Ionicons
                      name="remove"
                      size={16}
                      color={Palette.ink.primary}
                    />
                  </TouchableOpacity>

                  <Text style={styles.qtyText}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() =>
                      updateQuantity(item.product.id, item.quantity + 1)
                    }
                  >
                    <Ionicons
                      name="add"
                      size={16}
                      color={Palette.ink.primary}
                    />
                  </TouchableOpacity>

                  <Text style={styles.itemTotal}>
                    {formatNaira(item.product.price * item.quantity)}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatNaira(totalKobo)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Lagos Standard Delivery</Text>
              <Text style={styles.summaryValue}>
                {deliveryFeeKobo === 0 ? "FREE" : formatNaira(deliveryFeeKobo)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatNaira(grandTotalKobo)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={() => router.push("/checkout")}
              activeOpacity={0.88}
            >
              <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>

            <View style={styles.guaranteeRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={Palette.leaf[600]}
              />
              <Text style={styles.guaranteeText}>
                Guaranteed fresh arrival across Lagos
              </Text>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Palette.ink.primary,
  },
  countBadge: {
    fontSize: 14,
    fontWeight: "600",
    color: Palette.ink.soft,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 12,
    marginBottom: 12,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Palette.sand[100],
  },
  itemDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "space-between",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    color: Palette.ink.primary,
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  itemPrice: {
    fontSize: 13,
    color: Palette.ink.soft,
    marginTop: 2,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Palette.sand[100],
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "700",
    marginHorizontal: 12,
    color: Palette.ink.primary,
  },
  itemTotal: {
    marginLeft: "auto",
    fontSize: 14,
    fontWeight: "700",
    color: Palette.leaf[700],
  },
  summaryCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 20,
    marginTop: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Palette.ink.primary,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: Palette.ink.soft,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Palette.ink.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.line,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Palette.ink.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Palette.leaf[700],
  },
  checkoutButton: {
    backgroundColor: Palette.leaf[700],
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 18,
    gap: 8,
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    gap: 6,
  },
  guaranteeText: {
    fontSize: 12,
    color: Palette.ink.soft,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Palette.leaf[50],
    borderWidth: 1,
    borderColor: Palette.leaf[200],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Palette.ink.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Palette.ink.soft,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: Palette.leaf[700],
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },
  browseButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
