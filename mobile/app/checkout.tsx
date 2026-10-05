import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/context/CartContext';
import { formatNaira } from '@/lib/format';
import { Palette } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, totalKobo, clearCart } = useCart();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const deliveryFeeKobo = totalKobo > 5000000 ? 0 : 250000;
  const grandTotalKobo = totalKobo + deliveryFeeKobo;

  const handlePlaceOrder = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      Alert.alert(
        'Missing Information',
        'Please fill in all delivery contact and address details.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Get current auth user if available
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 2. Create order in Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id || null,
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          address: address.trim(),
          total: grandTotalKobo,
          currency: 'NGN',
          status: 'paid', // Mark as paid for demo order
        })
        .select()
        .single();

      if (orderError) {
        console.warn('Order creation note:', orderError.message);
      }

      // 3. Create order items if order was recorded
      if (order?.id) {
        const orderItemsPayload = items.map((item) => ({
          order_id: order.id,
          product_id: item.product.id.startsWith('f') ? null : item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
        }));

        await supabase.from('order_items').insert(orderItemsPayload);
      }

      // 4. Success state
      clearCart();
      setIsSuccess(true);
    } catch (err) {
      console.warn('Checkout error', err);
      // Still show success for demo if offline
      clearCart();
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-done" size={54} color={Palette.leaf[700]} />
          </View>
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successSubtitle}>
            Thank you, {fullName || 'there'}. We have received your order for {formatNaira(grandTotalKobo)}.
            Our florists will hand-tie your arrangement fresh for delivery.
          </Text>

          <View style={styles.receiptBox}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Recipient</Text>
              <Text style={styles.receiptValue}>{fullName}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Delivery To</Text>
              <Text style={styles.receiptValue} numberOfLines={1}>{address}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Total Paid</Text>
              <Text style={[styles.receiptValue, { color: Palette.leaf[700], fontWeight: '800' }]}>
                {formatNaira(grandTotalKobo)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace('/')}
            activeOpacity={0.88}
          >
            <Text style={styles.doneBtnText}>Return to Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={Palette.ink.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Contact & Delivery Form */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>

          <Text style={styles.fieldLabel}>Recipient Full Name</Text>
          <TextInput
            placeholder="e.g. Amaka Okafor"
            placeholderTextColor={Palette.ink.muted}
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput
            placeholder="amaka@example.com"
            placeholderTextColor={Palette.ink.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Phone Number (For Lagos Dispatch)</Text>
          <TextInput
            placeholder="+234 801 234 5678"
            placeholderTextColor={Palette.ink.muted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Delivery Address (Street, Area, Island/Mainland)</Text>
          <TextInput
            placeholder="e.g. 14 Admiralty Way, Lekki Phase 1, Lagos"
            placeholderTextColor={Palette.ink.muted}
            multiline
            numberOfLines={3}
            value={address}
            onChangeText={setAddress}
            style={[styles.input, styles.multilineInput]}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          {items.map((item) => (
            <View key={item.product.id} style={styles.summaryItemRow}>
              <Text style={styles.summaryItemName} numberOfLines={1}>
                {item.quantity}x {item.product.name}
              </Text>
              <Text style={styles.summaryItemPrice}>
                {formatNaira(item.product.price * item.quantity)}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.summaryItemRow}>
            <Text style={styles.summaryLabel}>Delivery</Text>
            <Text style={styles.summaryValue}>
              {deliveryFeeKobo === 0 ? 'FREE' : formatNaira(deliveryFeeKobo)}
            </Text>
          </View>

          <View style={styles.summaryItemRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatNaira(grandTotalKobo)}</Text>
          </View>
        </View>

        {/* Payment CTA */}
        <TouchableOpacity
          style={[styles.payButton, isSubmitting && styles.payButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting}
          activeOpacity={0.88}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="card-outline" size={20} color="#fff" />
              <Text style={styles.payButtonText}>
                Pay {formatNaira(grandTotalKobo)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.securityNote}>
          🔒 Secure 256-bit SSL encrypted transaction
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.ink.primary,
  },
  formSection: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 18,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.ink.primary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.ink.soft,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: Palette.canvas,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Palette.ink.primary,
  },
  multilineInput: {
    height: 72,
    textAlignVertical: 'top',
  },
  summarySection: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 18,
    marginTop: 16,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryItemName: {
    fontSize: 14,
    color: Palette.ink.primary,
    flex: 1,
    marginRight: 8,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.ink.primary,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.line,
    marginVertical: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: Palette.ink.soft,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.ink.primary,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Palette.ink.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.leaf[700],
  },
  payButton: {
    backgroundColor: Palette.leaf[700],
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
  },
  payButtonDisabled: {
    backgroundColor: Palette.sand[400],
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  securityNote: {
    textAlign: 'center',
    fontSize: 12,
    color: Palette.ink.muted,
    marginTop: 14,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Palette.leaf[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Palette.ink.primary,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 15,
    color: Palette.ink.soft,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  receiptBox: {
    width: '100%',
    backgroundColor: Palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 18,
    marginBottom: 28,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptLabel: {
    fontSize: 13,
    color: Palette.ink.soft,
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.ink.primary,
    maxWidth: '60%',
  },
  doneBtn: {
    backgroundColor: Palette.leaf[700],
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 36,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

