import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { predictFlightPrice } from './mlFlightPredictor';
import { sendEmailNotification } from './notificationService';
import { Platform } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class FlightPriceMonitor {
  constructor() {
    this.activeMonitors = new Map();
    this.setupNotifications();
  }

  async setupNotifications() {
    // Request permissions for notifications (only on native)
    if (Platform.OS === 'web') {
      console.log('Skipping notification setup on web.');
      return;
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return;
    }
    
    // Get the token that uniquely identifies this device
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })).data;
    
    console.log('Push notification token:', token);
  }

  /**
   * Creates a new price monitor for flight alerts
   * @param {Object} monitorData - The monitoring configuration
   * @param {string} monitorData.origin - Origin airport/city
   * @param {string} monitorData.destination - Destination airport/city
   * @param {Date} monitorData.departureDate - Departure date
   * @param {number} monitorData.budget - Maximum budget
   * @param {number} monitorData.maxWaitTime - Maximum wait time in hours
   * @param {string} monitorData.userEmail - User email for notifications
   * @returns {Promise<string>} Monitor ID
   */
  async createPriceMonitor(monitorData) {
    const monitorId = this.generateMonitorId();
    
    const monitor = {
      id: monitorId,
      ...monitorData,
      status: 'active',
      createdAt: new Date(),
      lastCheck: null,
      bestPrice: null,
      checksCount: 0,
      expiresAt: new Date(Date.now() + monitorData.maxWaitTime * 60 * 60 * 1000),
    };
    
    this.activeMonitors.set(monitorId, monitor);
    
    // Start monitoring
    this.startMonitoring(monitorId);
    
    console.log(`Created price monitor ${monitorId} for ${monitorData.origin} → ${monitorData.destination}`);
    
    return monitorId;
  }

  /**
   * Starts monitoring for a specific alert
   * @param {string} monitorId - Monitor ID
   */
  startMonitoring(monitorId) {
    const monitor = this.activeMonitors.get(monitorId);
    if (!monitor) return;

    // Check prices every 30 minutes (in production, this would be more sophisticated)
    const interval = setInterval(async () => {
      await this.checkPrices(monitorId);
    }, 30 * 60 * 1000); // 30 minutes

    // Store interval reference
    monitor.intervalId = interval;
    
    // Initial check
    this.checkPrices(monitorId);
  }

  /**
   * Checks prices for a specific monitor
   * @param {string} monitorId - Monitor ID
   */
  async checkPrices(monitorId) {
    const monitor = this.activeMonitors.get(monitorId);
    if (!monitor || monitor.status !== 'active') return;

    // Check if monitor has expired
    if (new Date() > monitor.expiresAt) {
      await this.expireMonitor(monitorId);
      return;
    }

    try {
      // Use ML predictor to get a more realistic price
      const predictedPrice = await predictFlightPrice(monitor);
      
      monitor.lastCheck = new Date();
      monitor.checksCount++;
      
      // Update best price if this is better
      if (!monitor.bestPrice || predictedPrice < monitor.bestPrice) {
        monitor.bestPrice = predictedPrice;
      }
      
      // Check if price meets budget criteria
      if (predictedPrice <= monitor.budget) {
        await this.notifyPriceFound(monitor, predictedPrice);
        await this.completeMonitor(monitorId);
      }
      
      console.log(`Price check for ${monitorId}: $${predictedPrice} (Budget: $${monitor.budget})`);
      
    } catch (error) {
      console.error(`Error checking prices for monitor ${monitorId}:`, error);
    }
  }

  /**
   * Sends notification when a good price is found
   * @param {Object} monitor - Monitor configuration
   * @param {number} price - Found price
   */
  async notifyPriceFound(monitor, price) {
    const title = 'Price Alert! ✈️';
    const body = `¡Hemos encontrado un vuelo por $${price} de ${monitor.origin} a ${monitor.destination}!`;
    
    // Enviar notificación push (solo en nativo)
    if (Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
        body,
        data: {
          monitorId: monitor.id,
          price,
          origin: monitor.origin,
          destination: monitor.destination,
        },
      },
      });
    }
    
    // Enviar correo electrónico
    await sendEmailNotification(
      monitor.userEmail,
      `¡Alerta de Precio de Vuelo! - ${monitor.origin} a ${monitor.destination}`,
      `¡Hola! Hemos encontrado un vuelo que coincide con tu presupuesto.
      
      Ruta: ${monitor.origin} → ${monitor.destination}
      Precio Encontrado: $${price}
      Tu Presupuesto: $${monitor.budget}
      
      ¡Reserva ahora antes de que el precio cambie!
      
      Gracias,
      El equipo de WadaTrip`
    );
    
    console.log(`Notificaciones enviadas para el monitor ${monitor.id}: Precio encontrado $${price}`);
  }

  /**
   * Handles monitor expiration
   * @param {string} monitorId - Monitor ID
   */
  async expireMonitor(monitorId) {
    const monitor = this.activeMonitors.get(monitorId);
    if (!monitor) return;

    monitor.status = 'expired';
    
    // Clear interval
    if (monitor.intervalId) {
      clearInterval(monitor.intervalId);
    }
    
    // Send expiration notification
    const title = 'Alerta de Precio Expirada';
    const body = `Tu alerta para ${monitor.origin} → ${monitor.destination} ha expirado. El mejor precio encontrado fue: $${monitor.bestPrice || 'N/A'}`;
    
    // Enviar notificación push (solo en nativo)
    if (Platform.OS !== 'web') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
        body,
        data: {
          monitorId: monitor.id,
          expired: true,
        },
      },
      });
    }
    
    // Enviar correo electrónico de expiración
    await sendEmailNotification(
      monitor.userEmail,
      `Tu Alerta de Precio para ${monitor.origin} → ${monitor.destination} ha Expirado`,
      `Hola,
      
      Tu monitoreo de precios para la ruta ${monitor.origin} → ${monitor.destination} ha finalizado.
      
      El mejor precio que encontramos fue: $${monitor.bestPrice || 'No se encontraron ofertas'}.
      
      Puedes crear una nueva alerta en cualquier momento.
      
      Gracias,
      El equipo de WadaTrip`
    );
    
    console.log(`Monitor ${monitorId} expirado`);
  }

  /**
   * Completes a monitor when price target is met
   * @param {string} monitorId - Monitor ID
   */
  async completeMonitor(monitorId) {
    const monitor = this.activeMonitors.get(monitorId);
    if (!monitor) return;

    monitor.status = 'completed';
    
    // Clear interval
    if (monitor.intervalId) {
      clearInterval(monitor.intervalId);
    }
    
    console.log(`Monitor ${monitorId} completed successfully`);
  }

  /**
   * Cancels an active monitor
   * @param {string} monitorId - Monitor ID
   * @returns {boolean} Success status
   */
  cancelMonitor(monitorId) {
    const monitor = this.activeMonitors.get(monitorId);
    if (!monitor) return false;

    monitor.status = 'cancelled';
    
    // Clear interval
    if (monitor.intervalId) {
      clearInterval(monitor.intervalId);
    }
    
    this.activeMonitors.delete(monitorId);
    
    console.log(`Monitor ${monitorId} cancelled`);
    return true;
  }

  /**
   * Gets all active monitors
   * @returns {Array} Array of active monitors
   */
  getActiveMonitors() {
    return Array.from(this.activeMonitors.values())
      .filter(monitor => monitor.status === 'active');
  }

  /**
   * Gets monitor by ID
   * @param {string} monitorId - Monitor ID
   * @returns {Object|null} Monitor object or null
   */
  getMonitor(monitorId) {
    return this.activeMonitors.get(monitorId) || null;
  }

  /**
   * Generates a unique monitor ID
   * @returns {string} Unique ID
   */
  generateMonitorId() {
    return `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup method to stop all monitors
   */
  cleanup() {
    for (const monitor of this.activeMonitors.values()) {
      if (monitor.intervalId) {
        clearInterval(monitor.intervalId);
      }
    }
    this.activeMonitors.clear();
  }
}

// Create singleton instance
const flightPriceMonitor = new FlightPriceMonitor();

export default flightPriceMonitor;