import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';
import { Palette } from '@/constants/Colors';
import { formatNaira } from '@/lib/format';
import { User } from '@supabase/supabase-js';
import { Order } from '@/types';

WebBrowser.maybeCompleteAuthSession();

export default function AccountScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Orders modal state
  const [ordersModalVisible, setOrdersModalVisible] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch orders for signed-in user
  const fetchOrders = async () => {
    if (!user) return;
    setOrdersLoading(true);
    setOrdersModalVisible(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Orders error:', error.message);
      } else {
        setOrders((data as Order[]) || []);
      }
    } catch (err) {
      console.warn('Failed to load orders', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Best-effort transactional email notification for mobile authentication
  const notifyAuthEmail = async (event: 'signup' | 'login', name?: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const apiUrl =
        process.env.EXPO_PUBLIC_API_URL || 'https://bloom-market.vercel.app';

      void fetch(`${apiUrl}/api/auth/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ event, fullName: name }),
      }).catch(() => {});
    } catch {
      // Non-fatal background email notification
    }
  };

  // Sign In / Sign Up handler
  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setAuthError('Please provide both email and password.');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            data: {
              full_name: fullName.trim() || undefined,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setUser(data.session.user);
          void notifyAuthEmail('signup', fullName.trim());
          Alert.alert('Welcome! 🌸', 'Your account has been created and you are now signed in.');
        } else {
          Alert.alert(
            'Account Created',
            'Supabase email confirmation is currently active. If you did not receive the email, disable "Confirm email" in your Supabase Dashboard (under Authentication > Providers > Email) to allow instant mobile sign-ins.'
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });

        if (error) throw error;
        setUser(data.user);
        void notifyAuthEmail('login');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Google OAuth handler
  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'bloommarket',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (res.type === 'success' && res.url) {
          const parsed = Linking.parse(res.url);
          const params = (parsed.queryParams || {}) as Record<string, string>;

          let accessToken: string | undefined = params.access_token;
          let refreshToken: string | undefined = params.refresh_token;

          if (!accessToken && res.url.includes('#')) {
            const hash = res.url.split('#')[1];
            const hashParams = new URLSearchParams(hash);
            accessToken = hashParams.get('access_token') || undefined;
            refreshToken = hashParams.get('refresh_token') || undefined;
          }

          if (typeof accessToken === 'string' && typeof refreshToken === 'string') {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            void notifyAuthEmail('login');
          }
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'Google sign in failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Palette.leaf[700]} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR BLOOM ACCOUNT</Text>
          <Text style={styles.title}>{user ? 'Account' : 'Sign In'}</Text>
        </View>

        {user ? (
          /* ================= SIGNED IN VIEW ================= */
          <View>
            <View style={styles.profileCard}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={28} color={Palette.leaf[700]} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user.email}
                </Text>
                <View style={styles.memberPill}>
                  <Text style={styles.memberPillText}>Bloom Member 🌸</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>ORDERS & DELIVERIES</Text>

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={fetchOrders}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons name="cube-outline" size={20} color={Palette.leaf[700]} />
                  </View>
                  <View>
                    <Text style={styles.menuItemText}>My Orders</Text>
                    <Text style={styles.menuItemSub}>Track past & current flower deliveries</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Palette.ink.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeader}>ABOUT BLOOM MARKET</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Hand-Tied in Lagos</Text>
                <Text style={styles.infoBody}>
                  Every bouquet is conditioned fresh each morning and delivered in
                  our signature insulated botanical boxes across Lagos.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color={Palette.bloom[600]} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ================= SIGN IN / SIGN UP FORM ================= */
          <View style={styles.authCard}>
            {/* Toggle Sign In / Create Account */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, !isSignUp && styles.toggleBtnActive]}
                onPress={() => {
                  setIsSignUp(false);
                  setAuthError(null);
                }}
              >
                <Text style={[styles.toggleBtnText, !isSignUp && styles.toggleBtnTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, isSignUp && styles.toggleBtnActive]}
                onPress={() => {
                  setIsSignUp(true);
                  setAuthError(null);
                }}
              >
                <Text style={[styles.toggleBtnText, isSignUp && styles.toggleBtnTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.authDescription}>
              {isSignUp
                ? 'Join Bloom Market to track deliveries, save addresses, and enjoy faster checkout.'
                : 'Welcome back! Sign in to view your orders and saved details.'}
            </Text>

            {authError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={Palette.bloom[600]} />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  placeholder="e.g. Amaka Okafor"
                  placeholderTextColor={Palette.ink.muted}
                  value={fullName}
                  onChangeText={setFullName}
                  style={styles.input}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor={Palette.ink.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={Palette.ink.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.primaryButton, authLoading && styles.primaryButtonDisabled]}
              onPress={handleAuth}
              disabled={authLoading}
              activeOpacity={0.88}
            >
              {authLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'Create Bloom Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google OAuth Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={authLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-google" size={18} color="#EA4335" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.securityBox}>
              <Ionicons name="lock-closed-outline" size={14} color={Palette.ink.muted} />
              <Text style={styles.securityText}>
                Your passwords and data are encrypted & protected.
              </Text>
            </View>
          </View>
        )}

        {/* ================= ORDERS MODAL ================= */}
        <Modal
          visible={ordersModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setOrdersModalVisible(false)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Orders</Text>
              <TouchableOpacity
                onPress={() => setOrdersModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={Palette.ink.primary} />
              </TouchableOpacity>
            </View>

            {ordersLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={Palette.leaf[700]} />
              </View>
            ) : orders.length === 0 ? (
              <View style={styles.emptyOrders}>
                <Ionicons name="receipt-outline" size={48} color={Palette.sand[400]} />
                <Text style={styles.emptyOrdersTitle}>No orders yet</Text>
                <Text style={styles.emptyOrdersSub}>
                  When you place an order, it will appear here with live dispatch updates.
                </Text>
              </View>
            ) : (
              <FlatList
                data={orders}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.ordersList}
                renderItem={({ item }) => (
                  <View style={styles.orderCard}>
                    <View style={styles.orderRow}>
                      <Text style={styles.orderRef}>
                        Order #{item.id.slice(0, 8).toUpperCase()}
                      </Text>
                      <View style={styles.statusPill}>
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    <Text style={styles.orderAddress} numberOfLines={1}>
                      📍 {item.address || 'Lagos, Nigeria'}
                    </Text>

                    <View style={styles.orderFooter}>
                      <Text style={styles.orderDate}>
                        {new Date(item.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                      <Text style={styles.orderTotal}>
                        {formatNaira(item.total)}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </SafeAreaView>
        </Modal>

        <Text style={styles.versionText}>Bloom Market Mobile v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.leaf[600],
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.ink.primary,
    marginTop: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Palette.line,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Palette.leaf[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: Palette.ink.primary,
  },
  userEmail: {
    fontSize: 13,
    color: Palette.ink.soft,
    marginTop: 2,
  },
  memberPill: {
    backgroundColor: Palette.bloom[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  memberPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: Palette.bloom[600],
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: Palette.ink.muted,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Palette.leaf[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.ink.primary,
  },
  menuItemSub: {
    fontSize: 12,
    color: Palette.ink.soft,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: Palette.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Palette.leaf[700],
    marginBottom: 6,
  },
  infoBody: {
    fontSize: 13,
    color: Palette.ink.soft,
    lineHeight: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.bloom[50],
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.bloom[200],
    gap: 8,
    marginTop: 8,
  },
  signOutText: {
    color: Palette.bloom[600],
    fontSize: 15,
    fontWeight: '700',
  },
  authCard: {
    backgroundColor: Palette.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Palette.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Palette.sand[100],
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Palette.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Palette.ink.soft,
  },
  toggleBtnTextActive: {
    color: Palette.ink.primary,
    fontWeight: '700',
  },
  authDescription: {
    fontSize: 13,
    color: Palette.ink.soft,
    lineHeight: 18,
    marginBottom: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Palette.bloom[50],
    borderWidth: 1,
    borderColor: Palette.bloom[200],
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: Palette.bloom[600],
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.ink.soft,
    marginBottom: 6,
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
  primaryButton: {
    backgroundColor: Palette.leaf[700],
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonDisabled: {
    backgroundColor: Palette.sand[400],
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Palette.line,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '700',
    color: Palette.ink.muted,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Palette.ink.primary,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    color: Palette.ink.muted,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Palette.ink.primary,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOrders: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyOrdersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Palette.ink.primary,
    marginTop: 14,
  },
  emptyOrdersSub: {
    fontSize: 14,
    color: Palette.ink.soft,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  ordersList: {
    padding: 20,
    gap: 12,
  },
  orderCard: {
    backgroundColor: Palette.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderRef: {
    fontSize: 14,
    fontWeight: '800',
    color: Palette.ink.primary,
  },
  statusPill: {
    backgroundColor: Palette.leaf[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: Palette.leaf[800],
  },
  orderAddress: {
    fontSize: 13,
    color: Palette.ink.soft,
    marginBottom: 10,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Palette.line,
    paddingTop: 8,
  },
  orderDate: {
    fontSize: 12,
    color: Palette.ink.muted,
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: Palette.leaf[700],
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Palette.ink.muted,
    marginTop: 24,
  },
});
