// src/services/mlFlightPredictor.js

/**
 * Alfred-inspired heuristic predictor for airline fares.
 * Captures advance purchase windows, seasonality, day-of-week effects,
 * and a simple route popularity/distance proxy. Provides both a numeric
 * price prediction and a buy/wait recommendation tuned to user budget.
 */
export const predictFlightPrice = async (flightData) => {
  const basePrice = calculateBasePrice(flightData);
  const seasonality = getSeasonalityFactor(flightData?.departureDate);
  const dow = getDayOfWeekFactor(flightData?.departureDate);
  const advance = getAdvanceBookingFactor(flightData?.departureDate);
  const demand = getDemandFactor(flightData?.origin, flightData?.destination);
  const volatility = getVolatilityFactor(flightData?.origin, flightData?.destination);

  const predicted = basePrice * seasonality * demand * dow * advance;
  // Bounded by a reasonable floor/ceiling per route class
  const cls = getRouteClass(flightData?.origin, flightData?.destination);
  const floor = ROUTE_CLASS_FLOOR[cls] || 150;
  const ceil = ROUTE_CLASS_CEIL[cls] || 1800;
  const jitter = 1 + (Math.random() - 0.5) * 0.12 * volatility; // up to ~±6% with volatility
  const finalPrice = Math.min(ceil, Math.max(floor, Math.round(predicted * jitter)));

  return new Promise((resolve) => setTimeout(() => resolve(finalPrice), 200));
};

/**
 * Calcula un precio base simulado basado en la distancia.
 * (Función de ayuda para la simulación)
 */
const calculateBasePrice = (flightData) => {
  const o = (flightData?.origin || '').trim();
  const d = (flightData?.destination || '').trim();
  const approxDistance = Math.min(1, Math.abs(d.length - o.length) / 10) // 0..1 proxy
  const routeClass = getRouteClass(o, d);
  const baseByClass = { short: 120, medium: 260, long: 520 };
  const base = baseByClass[routeClass] || 200;
  return base + approxDistance * (routeClass === 'long' ? 500 : routeClass === 'medium' ? 250 : 120);
};

/**
 * Obtiene un factor de estacionalidad basado en el mes.
 * (Función de ayuda para la simulación)
 */
const getSeasonalityFactor = (date) => {
  const month = new Date(date).getMonth();
  // Temporada alta (verano, diciembre)
  if (month === 11 || (month >= 5 && month <= 7)) {
    return 1.35; // peak
  }
  // Temporada baja (febrero, octubre)
  if (month === 1 || month === 9) {
    return 0.88; // low
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
    return 1.18; // 18% más de demanda
  }
  return 1.0;
};

const getVolatilityFactor = () => 1 + Math.random() * 0.5; // 1..1.5

const getRouteClass = (origin, destination) => {
  const pair = `${(origin || '').toLowerCase()}-${(destination || '').toLowerCase()}`;
  const longPairs = ['san francisco-tokyo', 'madrid-nueva york', 'madrid-new york', 'barcelona-new york'];
  if (longPairs.includes(pair)) return 'long';
  if ((origin || '').length + (destination || '').length > 14) return 'medium';
  return 'short';
};

const ROUTE_CLASS_FLOOR = { short: 80, medium: 180, long: 350 };
const ROUTE_CLASS_CEIL = { short: 450, medium: 900, long: 2200 };

// Day-of-week pricing tendencies for departure date (Tue/Wed often cheaper)
const getDayOfWeekFactor = (date) => {
  const d = new Date(date);
  const dow = d.getDay();
  if (dow === 2 || dow === 3) return 0.95; // Tue/Wed
  if (dow === 6 || dow === 0) return 1.05; // Sat/Sun
  return 1.0;
};

// Advance purchase curve: prices often lower 21–60 days out, then rise close-in
const getAdvanceBookingFactor = (date) => {
  const days = daysUntil(date);
  if (days <= 3) return 1.4;
  if (days <= 7) return 1.25;
  if (days <= 14) return 1.12;
  if (days <= 21) return 0.98;
  if (days <= 35) return 0.93;
  if (days <= 60) return 0.90; // sweet spot
  if (days <= 90) return 0.95;
  return 1.0;
};

const daysUntil = (date) => {
  const now = new Date();
  const d = new Date(date || now);
  return Math.max(0, Math.round((d.getTime() - now.getTime()) / (1000 * 3600 * 24)));
};

/**
 * Configuración del "modelo" de Machine Learning.
 * En esta simulación, solo contiene pesos de factores.
 */
const mlConfig = {
  seasonalityWeight: 0.25,
  demandWeight: 0.25,
  distanceWeight: 0.2,
  dowWeight: 0.1,
  advanceBookingWeight: 0.2,
};

/**
 * Obtiene la configuración actual del modelo de ML.
 * 
 * @returns {object} - La configuración del modelo.
 */
export const getMLConfig = () => {
  return mlConfig;
};

/**
 * High-level advice based on prediction vs budget and time window.
 * Returns: { predictedPrice, lowerBound, upperBound, confidence, recommendation, reason, nextCheckHours }
 */
export const getFlightAdvice = async (flightData) => {
  const predictedPrice = await predictFlightPrice(flightData);
  const days = daysUntil(flightData?.departureDate);
  const budget = Number(flightData?.budget || 0) || Infinity;

  // Confidence grows with data synergy (mid advance window) and stable routes
  let confidence = 0.55;
  if (days >= 21 && days <= 60) confidence += 0.15;
  if (predictedPrice < budget) confidence += 0.1;
  confidence = Math.min(0.9, Math.max(0.4, confidence));

  const spread = Math.max(25, Math.round(predictedPrice * (1.0 - confidence) * 0.6));
  const lowerBound = Math.max(50, predictedPrice - spread);
  const upperBound = predictedPrice + spread;

  let recommendation = 'wait';
  let reason = 'Prices may improve within your window.';
  let nextCheckHours = 24;

  if (predictedPrice <= budget) {
    recommendation = 'buy_now';
    reason = 'Predicted price is within your budget.';
    nextCheckHours = days <= 7 ? 6 : 12;
  } else if (days <= 7) {
    recommendation = 'buy_soon';
    reason = 'Close to departure; prices usually rise. Consider adjusting dates/budget.';
    nextCheckHours = 6;
  } else if (days <= 21) {
    recommendation = 'watch';
    reason = 'Approaching buy window; set tighter alerts and check more frequently.';
    nextCheckHours = 12;
  } else {
    recommendation = 'wait';
    reason = 'Best deals often appear 3–8 weeks out.';
    nextCheckHours = 24;
  }

  return { predictedPrice, lowerBound, upperBound, confidence, recommendation, reason, nextCheckHours };
};
