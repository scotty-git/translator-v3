import { LanguageDetectionService } from '../src/services/openai/language-detection';

console.log('🧪 Testing Language Detection Service\n');

// Test 1: Supported language mapping
console.log('=== Test 1: Supported Language Mapping ===');
const supportedTests = [
  { input: 'en', expected: 'English' },
  { input: 'english', expected: 'English' },
  { input: 'es', expected: 'Spanish' },
  { input: 'spanish', expected: 'Spanish' },
  { input: 'pt', expected: 'Portuguese' },
  { input: 'portuguese', expected: 'Portuguese' },
  { input: 'pt-br', expected: 'Portuguese' },
];

supportedTests.forEach(test => {
  const result = LanguageDetectionService.mapWhisperLanguage(test.input);
  console.log(`Input: "${test.input}" → Result: ${result} ${result === test.expected ? '✅' : '❌'}`);
});

// Test 2: Unsupported language mapping
console.log('\n=== Test 2: Unsupported Language Mapping ===');
const unsupportedTests = ['ko', 'korean', 'zh', 'chinese', 'ja', 'japanese', 'fr', 'french'];

unsupportedTests.forEach(lang => {
  const result = LanguageDetectionService.mapWhisperLanguage(lang);
  console.log(`Input: "${lang}" → Result: ${result} ${result === null ? '✅ (correctly rejected)' : '❌'}`);
});

// Test 3: Pattern-based detection
console.log('\n=== Test 3: Pattern-Based Language Detection ===');
const textTests = [
  { text: 'Hello, how are you today?', expected: 'English' },
  { text: 'Hola, ¿cómo estás hoy?', expected: 'Spanish' },
  { text: 'Olá, como você está hoje?', expected: 'Portuguese' },
  { text: '안녕하세요', expected: null }, // Korean - should fail
  { text: 'Bonjour comment allez-vous', expected: null }, // French - should fail
];

textTests.forEach(test => {
  const result = LanguageDetectionService.detectLanguageFromText(test.text);
  console.log(`Text: "${test.text}"`);
  console.log(`  → Result: ${result} ${result === test.expected ? '✅' : '❌'}\n`);
});

// Test 4: Combined detection with fallback
console.log('=== Test 4: Combined Detection with Fallback ===');
const combinedTests = [
  { whisper: 'en', text: 'Hello there', expected: 'English' },
  { whisper: 'ko', text: 'How are you doing?', expected: 'English' }, // Korean detected but text is English
  { whisper: 'unknown', text: '¿Cómo estás?', expected: 'Spanish' }, // Unknown language but Spanish text
  { whisper: 'ko', text: '안녕하세요', expected: null }, // Korean in both - should fail
];

combinedTests.forEach(test => {
  const result = LanguageDetectionService.detectLanguageWithFallback(test.whisper, test.text);
  console.log(`Whisper: "${test.whisper}", Text: "${test.text}"`);
  console.log(`  → Result: ${result} ${result === test.expected ? '✅' : '❌'}\n`);
});

console.log('✅ Language detection tests complete!');