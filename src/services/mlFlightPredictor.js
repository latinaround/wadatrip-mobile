// src/services/mlFlightPredictor.js

/**
 * Simula una predicción de precios de vuelos utilizando un algoritmo de Machine Learning.
 * Por ahora, devuelve un precio aleatorio para simular la funcionalidad.
 * 
 * @param {object} flightData - Datos del vuelo para la predicción.
 * @returns {Promise<number>} - El precio predicho para el vuelo.
 */
export const predictFlightPrice = async (flightData) => {
  console.log('Prediciendo precio para:', flightData);

  // Simulación más avanzada de predicción de precios
  const basePrice = calculateBasePrice(flightData);
  const seasonalityFactor = getSeasonalityFactor(flightData.departureDate);
  const demandFactor = getDemandFactor(flightData.origin, flightData.destination);
  
  // Lógica de predicción simplificada
  const predictedPrice = basePrice * seasonalityFactor * demandFactor;
  
  // Añadir una pequeña variación aleatoria
  const finalPrice = Math.round(predictedPrice * (Math.random() * (1.1 - 0.9) + 0.9));

  return new Promise(resolve => {
    setTimeout(() => {
      resolve(finalPrice);
    }, 300); // Simular latencia de red
  });
};

/**
 * Calcula un precio base simulado basado en la distancia.
 * (Función de ayuda para la simulación)
 */
const calculateBasePrice = (flightData) => {
  // Simulación simple: mayor distancia = mayor precio
  const distance = Math.abs((flightData.destination.length - flightData.origin.length) * 100);
  return 200 + distance; // Precio base mínimo de $200
};

/**
 * Obtiene un factor de estacionalidad basado en el mes.
 * (Función de ayuda para la simulación)
 */
const getSeasonalityFactor = (date) => {
  const month = new Date(date).getMonth();
  // Temporada alta (verano, diciembre)
  if (month === 11 || (month >= 5 && month <= 7)) {
    return 1.5; // 50% más caro
  }
  // Temporada baja (febrero, octubre)
  if (month === 1 || month === 9) {
    return 0.8; // 20% más barato
  }
  return 1.0; // Normal
};

/**
 * Obtiene un factor de demanda basado en la popularidad de la ruta.
 * (Función de ayuda para la simulación)
 */
const getDemandFactor = (origin, destination) => {
  const popularRoutes = ['Madrid-Tokio', 'Barcelona-Nueva York'];
  if (popularRoutes.includes(`${origin}-${destination}`)) {
    return 1.2; // 20% más de demanda
  }
  return 1.0;
};

/**
 * Configuración del "modelo" de Machine Learning.
 * En esta simulación, solo contiene pesos de factores.
 */
const mlConfig = {
  seasonalityWeight: 0.3,
  demandWeight: 0.25,
  distanceWeight: 0.2,
  cabinClassWeight: 0.15,
  advanceBookingWeight: 0.1
};

/**
 * Obtiene la configuración actual del modelo de ML.
 * 
 * @returns {object} - La configuración del modelo.
 */
export const getMLConfig = () => {
  return mlConfig;
};