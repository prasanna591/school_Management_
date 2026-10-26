import { useCallback, useEffect, useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';

import { StatusBarTone } from '../../components/StatusBarTone';
import { ROUTES } from '../../navigation/routes';

/** Headline shown word-by-word; split here so each word can fade in. */
const HEADLINE_WORDS = ['Smarter', 'school', 'management', 'unified'];

/* --------------------------------------------------------------------------
   Custom logo — an "S" monogram under a graduation cap, warm orange/amber.
   Drawn inline with react-native-svg: no image asset, scales to any size.
   -------------------------------------------------------------------------- */
function SchoolLogo({ size = 62 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <SvgGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fcd34d" />
          <Stop offset="1" stopColor="#f59e0b" />
        </SvgGradient>
      </Defs>
      {/* Frosted tile behind the mark */}
      <Rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="18"
        fill="rgba(255,255,255,0.13)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      {/* Graduation cap: crown band + mortarboard + tassel */}
      <Path
        d="M17 27v7c0 3.6 6.7 6.5 15 6.5s15-2.9 15-6.5v-7"
        fill="none"
        stroke="url(#logoGrad)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <Polygon points="32,12 58,21 32,30 6,21" fill="url(#logoGrad)" />
      <Path d="M52 23.5v8.5" stroke="url(#logoGrad)" strokeWidth="2.6" strokeLinecap="round" />
      {/* The S monogram */}
      <Path
        d="M40.5 40c-2.2-1.8-5-2.7-8.3-2.7-3.5 0-6 1.5-6 3.9 0 2.2 1.9 3.2 5.9 4.1 4.6 1.1 7.2 2.4 7.2 5.4 0 3-2.9 5-7.6 5-3.8 0-7-1.3-9.5-3.8"
        fill="none"
        stroke="url(#logoGrad)"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* --------------------------------------------------------------------------
   Word-by-word headline fade-in
   -------------------------------------------------------------------------- */
function AnimatedHeadline({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <View style={styles.headlineRow}>
      {HEADLINE_WORDS.map((word, index) => (
        <Animated.Text
          key={word}
          style={styles.headline}
          entering={reduceMotion ? undefined : FadeIn.delay(160 + index * 130).duration(480)}
        >
          {word}
        </Animated.Text>
      ))}
    </View>
  );
}

/**
 * The SmartSchool welcome / login-landing screen.
 *
 * A clean three-zone layout: the logo and wordmark sit near the top (below
 * the safe area), the headline + subtitle are vertically centered in a
 * flexible middle section, and the Login / Register / Explore actions anchor
 * the bottom. The original handlers are untouched: Login opens the existing
 * admin sign-in screen, Register shows the "contact your administrator"
 * notice, and Explore opens the public marketing stack.
 */
export function WelcomeScreen() {
  const navigation = useNavigation<{ navigate: (route: string, params?: object) => void }>();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion() ?? false;

  /* --- Tap guards ---------------------------------------------------------
     `@react-navigation/stack` silently drops a navigate call made while the
     previous transition is still animating, and a second tap can double-push
     a screen — both show up as "the button does nothing". Every press handler
     is therefore guarded until the transition/dialog has settled. -------- */
  const navGuardRef = useRef(false);

  // Preserved from the original screen: accounts are created by the school.
  // (The backend's POST /auth/register requires an authenticated user with
  // USER_CREATE permission, so there is no public registration form to open —
  // pointing at the administrator is the designed flow.)
  const registerGuardRef = useRef(false);
  const onRegister = useCallback(() => {
    if (registerGuardRef.current) return;
    registerGuardRef.current = true;
    Alert.alert(
      'Contact your school administrator',
      'SmartSchool accounts are created by your school administrator. Please ask them to set up your account (or reset your password) and share your sign-in details.',
      [
        {
          text: 'OK',
          onPress: () => {
            registerGuardRef.current = false;
          },
        },
      ],
      {
        // Android dismisses alerts with the back button without firing a
        // button callback; release the guard there too.
        onDismiss: () => {
          registerGuardRef.current = false;
        },
      },
    );
  }, []);

  // Login opens the existing admin sign-in screen (unchanged route and API).
  const onLogin = useCallback(() => {
    // TEMP DEBUG ([SS-DEBUG] logs are safe to delete after device verification).
    console.log('[SS-DEBUG] WelcomeScreen: Login pressed', {
      guardActive: navGuardRef.current,
      target: ROUTES.public.login,
    });
    if (navGuardRef.current) return;
    navGuardRef.current = true;
    navigation.navigate(ROUTES.public.login);
    setTimeout(() => {
      navGuardRef.current = false;
    }, 700);
  }, [navigation]);

  // Explore opens the public marketing stack (unchanged route).
  const onExplore = useCallback(() => {
    // TEMP DEBUG ([SS-DEBUG] logs are safe to delete after device verification).
    console.log('[SS-DEBUG] WelcomeScreen: Explore pressed', {
      guardActive: navGuardRef.current,
      target: 'public',
    });
    if (navGuardRef.current) return;
    navGuardRef.current = true;
    navigation.navigate('public');
    setTimeout(() => {
      navGuardRef.current = false;
    }, 700);
  }, [navigation]);

  /* --- Background blobs + logo pulse --------------------------------------
     Started in an effect, NOT during render. Mutating a Reanimated shared
     value while rendering is unsupported ("Attempting to modify shared value
     during render"): it restarts all three perpetual loops on every render,
     flooding the UI thread and Reanimated's event queue — a documented way
     to end up with dropped or erratic taps. The loops now start once, are
     zeroed for reduced-motion users, and are cancelled on unmount. ------- */
  const blobOne = useSharedValue(0);
  const blobTwo = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      blobOne.value = 0;
      blobTwo.value = 0;
      pulse.value = 0;
      return;
    }
    blobOne.value = withRepeat(
      withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    blobTwo.value = withRepeat(
      withTiming(1, { duration: 11000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(blobOne);
      cancelAnimation(blobTwo);
      cancelAnimation(pulse);
    };
  }, [reduceMotion, blobOne, blobTwo, pulse]);

  const blobOneStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: 26 * blobOne.value - 13 },
      { translateY: -20 * blobOne.value + 10 },
      { scale: 1 + 0.12 * blobOne.value },
    ],
  }));
  const blobTwoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -22 * blobTwo.value + 11 },
      { translateY: 24 * blobTwo.value - 12 },
      { scale: 1.08 - 0.1 * blobTwo.value },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.035 * pulse.value }],
  }));

  // TEMP DEBUG: confirms the screen actually mounted (rules out the app never
  // reaching this screen, which would look like "dead buttons").
  useEffect(() => {
    console.log('[SS-DEBUG] WelcomeScreen mounted', { reduceMotion });
  }, [reduceMotion]);

  return (
    <View style={styles.screen}>
      <StatusBarTone barStyle="light-content" />
      {/* Deep purple gradient wash */}
      <LinearGradient
        colors={['#2e1065', '#4c1d95', '#1e1b4b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Slow-moving blurred background blobs, kept behind all content */}
      <Animated.View style={[styles.blob, styles.blobOne, blobOneStyle]} pointerEvents="none" />
      <Animated.View style={[styles.blob, styles.blobTwo, blobTwoStyle]} pointerEvents="none" />

      {/* Three-zone flex column. On normal phone heights nothing scrolls; on
          very short screens the ScrollView keeps everything reachable —
          readability is prioritised over forcing a fixed height. */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          // Safe-area top padding + 24px so the logo/title are never clipped.
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ---- Top: logo + wordmark -------------------------------------- */}
        <View style={styles.top}>
          <Animated.View style={pulseStyle}>
            <SchoolLogo />
          </Animated.View>
          <Text style={styles.brand}>SmartSchool</Text>
        </View>

        {/* ---- Middle: flexible space, headline + subtitle centered ------- */}
        <View style={styles.middle}>
          <AnimatedHeadline reduceMotion={reduceMotion} />
          <Text style={styles.subtitle}>
            Admissions, academics, finance and communication — in your pocket.
          </Text>
        </View>

        {/* ---- Bottom: Login / Register / Explore -------------------------
            All three sit above the decorative blob layer (drawn first, with
            pointerEvents="none") and are plain RN Pressables, so taps reach
            their onPress handlers on Android and iOS. */}
        <View style={styles.actions}>
          <Pressable
            onPress={onLogin}
            style={({ pressed }) => [
              styles.primaryPressable,
              pressed && !reduceMotion && styles.btnPressed,
            ]}
            accessibilityLabel="Login"
            accessibilityRole="button"
            testID="welcome-login"
          >
            <LinearGradient
              colors={['#fcd34d', '#f59e0b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>Login</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={onRegister}
            style={({ pressed }) => [styles.secondary, pressed && !reduceMotion && styles.btnPressed]}
            accessibilityLabel="Register"
            accessibilityRole="button"
            testID="welcome-register"
          >
            <Text style={styles.secondaryText}>Register</Text>
          </Pressable>

          <Pressable
            onPress={onExplore}
            style={({ pressed }) => [styles.siteLink, pressed && { opacity: 0.7 }]}
            accessibilityLabel="Explore the public site"
            accessibilityRole="link"
            testID="welcome-explore"
          >
            <Text style={styles.siteLinkText}>Explore Features</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/* --------------------------------------------------------------------------
   Styles — self-contained. Tuned for 360–430px widths: safe-area-aware top
   padding, a flexible middle so the headline/subtitle sit in their own
   dedicated space (no overlap, natural wrapping), and 44px+ touch targets
   on every control.
   -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    gap: 16,
  },

  /* Background blobs — large, very soft translucent circles, always behind */
  blob: {
    position: 'absolute',
    borderRadius: 999,
    pointerEvents: 'none',
  },
  blobOne: {
    width: 300,
    height: 300,
    top: -70,
    right: -80,
    backgroundColor: 'rgba(168, 85, 247, 0.28)',
  },
  blobTwo: {
    width: 260,
    height: 260,
    bottom: -60,
    left: -70,
    backgroundColor: 'rgba(99, 102, 241, 0.24)',
  },

  /* Top zone — logo + wordmark, padded below the safe area */
  top: {
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    fontSize: 21,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
  },

  /* Middle zone — flexible, centers the copy in the remaining space.
     flex: 1 inside a flexGrow:1 ScrollView content container. */
  middle: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  headlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 8,
  },
  headline: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 21,
    color: 'rgba(233, 231, 255, 0.88)',
    textAlign: 'center',
  },

  /* Bottom zone — actions anchored near the bottom */
  actions: {
    marginTop: 'auto',
    gap: 10,
  },
  /* Hit-area frame for the Login Pressable itself (the gradient below draws
     the visible surface); keeps the 52px target and a stable radius. */
  primaryPressable: {
    borderRadius: 16,
  },
  primary: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    // Warm orange accent with a soft depth shadow.
    shadowColor: '#92400e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryText: {
    color: '#1e1b4b',
    fontWeight: '800',
    fontSize: 16,
  },
  secondary: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  secondaryText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  // Press scaling for the primary/outline buttons (micro-interaction).
  btnPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  siteLink: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  siteLinkText: {
    color: '#e9e7ff',
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
