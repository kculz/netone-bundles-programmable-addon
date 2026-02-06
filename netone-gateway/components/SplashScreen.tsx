import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withDelay,
    withTiming,
    Easing
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
    onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
    const scale = useSharedValue(0.5);
    const opacity = useSharedValue(0);
    const textTranslateY = useSharedValue(50);
    const containerOpacity = useSharedValue(1);

    useEffect(() => {
        // Start animations
        opacity.value = withTiming(1, { duration: 800 });
        scale.value = withSpring(1, { damping: 10, stiffness: 100 });
        textTranslateY.value = withSpring(0, { damping: 12 });

        // Exit animation after delay
        const timer = setTimeout(() => {
            containerOpacity.value = withTiming(0, { duration: 500 }, () => {
                // Determine when to unmount
            });

            // Call onFinish slightly before full cleanup to allow smoother transition
            setTimeout(onFinish, 800); // 500ms fade + slight buffer
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    const animatedLogoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
        translateY: textTranslateY.value
    }));

    const animatedContainerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value
    }));

    return (
        <Animated.View style={[styles.container, animatedContainerStyle]}>
            <LinearGradient
                colors={['#0f0c29', '#302b63', '#24243e']}
                style={styles.background}
            />

            <Animated.View style={[styles.logoContainer, animatedLogoStyle]}>
                <Text style={styles.xText}>X</Text>
                <Text style={styles.ashText}>ash</Text>
                <View style={styles.dot} />
            </Animated.View>

            <Animated.Text style={[styles.tagline, { opacity: opacity }]}>
                Next Gen Gateway
            </Animated.Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    xText: {
        fontSize: 72,
        fontWeight: '900',
        color: '#4CAF50', // Brand Green
        fontStyle: 'italic',
    },
    ashText: {
        fontSize: 72,
        fontWeight: '300',
        color: '#FFFFFF',
        letterSpacing: -2,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4CAF50',
        marginLeft: 4,
    },
    tagline: {
        marginTop: 20,
        color: '#8F9BB3',
        fontSize: 16,
        letterSpacing: 4,
        fontWeight: '200',
        textTransform: 'uppercase',
    },
});
