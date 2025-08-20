import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const WadaAgent = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: 'Hi! I\'m WadaAgent, your travel AI. How can I help today?',
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  
  // Usar useRef para mantener las animaciones estables
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;
  const bounceAnim = React.useRef(new Animated.Value(0)).current;
  const dotsAnim = React.useRef(new Animated.Value(0)).current;
  const [botTyping, setBotTyping] = useState(false);

  const theme = {
    primary: '#2a9d8f',
    accent: '#3a86ff',
    bubbleBot: '#f1f5f9',
    bubbleUser: '#2a9d8f',
  };

  useEffect(() => {
    // Animación de pulso más intensa para llamar la atención
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Animación de brillo
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: false,
        }),
      ])
    );
    
    // Animación de rebote inicial
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -8,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    );

    // Dots typing animation loop
    const dotsAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(dotsAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );

    // Only run button animations when chat is closed (improves web typing stability)
    if (!isExpanded) {
      pulseAnimation.start();
      glowAnimation.start();
      bounceAnimation.start();
    }
    dotsAnimation.start();
    
    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
      bounceAnimation.stop();
      dotsAnimation.stop();
    };
  }, [isExpanded]);

  const sendMessage = React.useCallback(() => {
    if (message.trim()) {
      const currentMessage = message;
      const messageId = Date.now();
      
      const newMessage = {
        id: messageId,
        text: currentMessage,
        isBot: false,
        timestamp: new Date(),
      };
      
      setMessages(prevMessages => [...prevMessages, newMessage]);
      setMessage('');
      
      // Simular respuesta del bot con respuestas específicas de WadaTrip
      setBotTyping(true);
      setTimeout(() => {
        const responses = [
          'Great! I can find the best flight deals for you.',
          'I can set price alerts for your favorite destinations.',
          'Let me search the cheapest flights for your dates.',
          'Tip: Enable notifications so you never miss a deal.',
          'Awesome, let’s create your personalized price alert.',
          'I can compare airlines to get you the best fare.',
          'I’ll suggest the best time windows to buy.',
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const botResponse = {
          id: messageId + 1,
          text: randomResponse,
          isBot: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
        setBotTyping(false);
      }, 1000);
    }
  }, [message]);

  const handlePress = React.useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsExpanded(true);
    
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, slideAnim]);

  const handleClose = React.useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsExpanded(false);
    });
  }, [slideAnim]);

  const scrollRef = React.useRef(null);

  // Auto-scroll when a new message arrives
  useEffect(() => {
    try {
      if (scrollRef.current) {
        scrollRef.current.scrollToEnd({ animated: true });
      }
    } catch {}
  }, [messages.length]);

  // Focus input when modal opens (helps web/mobile)
  const inputRef = React.useRef(null);
  useEffect(() => {
    if (isExpanded) {
      const id = setTimeout(() => {
        try { inputRef.current?.focus?.(); } catch {}
      }, 100);
      return () => clearTimeout(id);
    }
  }, [isExpanded]);

  // Helper to format time locale EN
  const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* Floating Button */}
      <View style={styles.floatingContainer}>
        <Animated.View
          style={[
            styles.floatingButton,
            {
              transform: [
                { scale: scaleAnim },
                { scale: pulseAnim },
                { translateY: bounceAnim },
              ],
              shadowColor: glowAnim.interpolate({ inputRange: [0, 1], outputRange: ['#FF6B6B', '#FFD93D'] }),
              shadowOpacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] }),
              shadowRadius: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 20] }),
            },
          ]}
        >
          <Animated.View style={[styles.glowRing, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) }]} />
          <TouchableOpacity onPress={handlePress} style={styles.buttonContent} activeOpacity={0.85}>
            <Ionicons name="chatbubble-ellipses" size={22} color="white" />
            <Text style={styles.floatingButtonText}>WadaAgent</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Chat Modal */}
      <Modal visible={isExpanded} transparent={true} animationType="none" onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.chatContainer,
              { transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }] },
            ]}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoid}>
              {/* Header */}
              <View style={styles.chatHeader}>
                <View style={styles.headerLeft}>
                  <View style={styles.agentAvatar}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                  </View>
                  <View>
                    <Text style={styles.agentName}>WadaAgent</Text>
                    <Text style={styles.agentStatus}>AI Assistant • Online</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Messages */}
              <ScrollView
                style={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps={Platform.OS === 'web' ? 'always' : 'handled'}
                ref={scrollRef}
              >
                {messages.map((msg) => (
                  <View key={msg.id} style={[styles.messageWrapper, msg.isBot ? styles.botMessageWrapper : styles.userMessageWrapper]}>
                    <View style={[styles.messageBubble, msg.isBot ? styles.botMessage : styles.userMessage] }>
                      <Text style={[styles.messageText, msg.isBot ? styles.botMessageText : styles.userMessageText]}>
                        {msg.text}
                      </Text>
                    </View>
                    <Text style={styles.messageTime}>{formatTime(msg.timestamp)}</Text>
                  </View>
                ))}
                {botTyping && (
                  <View style={[styles.messageWrapper, styles.botMessageWrapper]}>
                    <View style={[styles.messageBubble, styles.botMessage, { flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 12 }]}>
                      {[0,1,2].map((i) => (
                        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#94a3b8', opacity: dotsAnim.interpolate({ inputRange: [0,1], outputRange: i === 1 ? [0.3, 1] : [1, 0.3] }) }} />
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Quick suggestions */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsRow}>
                {['Find flights to Tokyo', 'Best tours under $500', 'Plan 3-day itinerary', 'Set price alert'].map((s) => (
                  <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => { setMessage(s); setTimeout(() => sendMessage(), 0); }}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.textInput}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Type your message..."
                  placeholderTextColor="#999"
                  multiline
                  maxLength={500}
                  blurOnSubmit={false}
                  returnKeyType={Platform.OS === 'web' ? 'default' : 'send'}
                  onKeyPress={Platform.OS === 'web' ? ({ nativeEvent }) => {
                    if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                      nativeEvent.preventDefault?.();
                      sendMessage();
                    }
                  } : undefined}
                />
                <TouchableOpacity onPress={sendMessage} style={[styles.sendButton, { opacity: message.trim() ? 1 : 0.5, backgroundColor: theme.accent }]} disabled={!message.trim()}>
                  <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  floatingLabel: {
    display: 'none',
  },
  floatingButton: {
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a9d8f',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  glowRing: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 24,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3a86ff',
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  floatingButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.8,
    paddingTop: 20,
  },
  keyboardAvoid: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a9d8f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  agentStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  messageWrapper: {
    marginBottom: 15,
  },
  botMessageWrapper: {
    alignItems: 'flex-start',
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
  },
  botMessage: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  userMessage: {
    backgroundColor: '#2a9d8f',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  botMessageText: {
    color: '#333',
  },
  userMessageText: {
    color: 'white',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    marginHorizontal: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    backgroundColor: 'white',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a9d8f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsRow: { paddingHorizontal: 16, paddingTop: 8 },
  suggestionChip: { backgroundColor: '#eef2f7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, marginRight: 8 },
  suggestionText: { color: '#1d3557', fontWeight: '600' },
});

export default WadaAgent;
