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
      text: '¡Hola! Soy WadaAgent, tu operador de viajes IA para WadaTrip. ¿En qué puedo ayudarte hoy?',
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

  useEffect(() => {
    // Animación de pulso más intensa para llamar la atención
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    // Animación de brillo
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );
    
    // Animación de rebote inicial
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimation.start();
    glowAnimation.start();
    bounceAnimation.start();
    
    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
      bounceAnimation.stop();
    };
  }, []);

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
      setTimeout(() => {
        const responses = [
          '¡Excelente! Te ayudo a encontrar las mejores ofertas de vuelos.',
          'Puedo configurar alertas de precios para tus destinos favoritos.',
          'Déjame buscar los vuelos más baratos para tus fechas.',
          'Te recomiendo activar las notificaciones para no perder ofertas.',
          '¡Perfecto! Vamos a crear tu alerta de precio personalizada.',
          'Puedo ayudarte a comparar precios entre diferentes aerolíneas.',
          'Te sugiero los mejores momentos para comprar tu vuelo.',
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const botResponse = {
          id: messageId + 1,
          text: randomResponse,
          isBot: true,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
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

  const FloatingButton = React.memo(() => (
    <View style={styles.floatingContainer}>
      <Text style={styles.floatingLabel}>WadaAgent</Text>
      <Animated.View
        style={[
          styles.floatingButton,
          {
            transform: [
              { scale: scaleAnim },
              { scale: pulseAnim },
              { translateY: bounceAnim },
            ],
            shadowColor: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['#FF6B6B', '#FFD93D'],
            }),
            shadowOpacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.8],
            }),
            shadowRadius: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 20],
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glowRing,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.6],
              }),
              transform: [{
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.5],
                }),
              }],
            },
          ]}
        />
        <TouchableOpacity
          onPress={handlePress}
          style={styles.buttonContent}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={28} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  ));

  const ChatModal = React.memo(() => (
    <Modal
      visible={isExpanded}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.chatContainer,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            {/* Header del Chat */}
            <View style={styles.chatHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.agentAvatar}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                </View>
                <View>
                  <Text style={styles.agentName}>WadaAgent</Text>
                  <Text style={styles.agentStatus}>Asistente IA • En línea</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Mensajes */}
            <ScrollView
              style={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ref={scrollRef}
            >
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageWrapper,
                    msg.isBot ? styles.botMessageWrapper : styles.userMessageWrapper,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      msg.isBot ? styles.botMessage : styles.userMessage,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        msg.isBot ? styles.botMessageText : styles.userMessageText,
                      ]}
                    >
                      {msg.text}
                    </Text>
                  </View>
                  <Text style={styles.messageTime}>
                    {msg.timestamp.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Input de Mensaje */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={message}
                onChangeText={(text) => setMessage(text)}
                placeholder="Type your message..."
                placeholderTextColor="#999"
                multiline
                maxLength={500}
                blurOnSubmit={false}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage()}
              />
              <TouchableOpacity
                onPress={sendMessage}
                style={[
                  styles.sendButton,
                  { opacity: message.trim() ? 1 : 0.5 },
                ]}
                disabled={!message.trim()}
              >
                <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  ));

  return (
    <>
      <FloatingButton />
      <ChatModal />
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    overflow: 'hidden',
  },
  floatingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  glowRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFD93D',
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
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
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  userMessage: {
    backgroundColor: '#FF6B6B',
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
    borderTopColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
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
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WadaAgent;
