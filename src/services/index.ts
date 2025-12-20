/**
 * Services exports
 */

export {
  loadBonusItemsConfig,
  loadConditionalBonusesConfig,
  loadAllConfigs,
  getBonusItemById,
  searchBonusItems,
  searchConditionalBonuses,
} from './config-loader.js';

export {
  initOCR,
  recognizeText,
  extractTextFromCanvas,
  terminateOCR,
  isOCRAvailable,
} from './ocr-service.js';
