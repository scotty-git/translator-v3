#!/bin/bash

# Create Test Audio Files for Playwright Testing
# This script generates test audio files using macOS 'say' command

echo "🎵 Creating Test Audio Files for Core User Experience Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if 'say' command is available
if ! command -v say &> /dev/null; then
    echo "❌ 'say' command not found. This script requires macOS."
    echo "💡 Alternative: Use the guide in generate-test-audio.js"
    exit 1
fi

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p test-audio/{english,spanish,portuguese}

echo "🗣️ Generating English test audio..."
say "Hello, how are you today?" -o test-audio/english/hello.aiff
say "Good morning, nice to meet you" -o test-audio/english/morning.aiff
say "Can you help me with directions?" -o test-audio/english/directions.aiff
say "Thank you very much for your help" -o test-audio/english/thanks.aiff
say "What time is it now?" -o test-audio/english/time.aiff

echo "🗣️ Generating Spanish test audio..."
# Check if Spanish voice is available
if say -v ? | grep -q "Monica\|Diego\|Jorge"; then
    SPANISH_VOICE="Monica"
    if ! say -v ? | grep -q "Monica"; then
        SPANISH_VOICE="Diego"
    fi
    echo "Using Spanish voice: $SPANISH_VOICE"
    
    say "Hola, ¿cómo estás hoy?" -v $SPANISH_VOICE -o test-audio/spanish/hola.aiff
    say "Buenos días, mucho gusto" -v $SPANISH_VOICE -o test-audio/spanish/morning.aiff
    say "¿Puedes ayudarme con direcciones?" -v $SPANISH_VOICE -o test-audio/spanish/direcciones.aiff
    say "Muchas gracias por tu ayuda" -v $SPANISH_VOICE -o test-audio/spanish/gracias.aiff
    say "¿Qué hora es ahora?" -v $SPANISH_VOICE -o test-audio/spanish/hora.aiff
else
    echo "⚠️ Spanish voice not found, using default voice"
    say "Hola, cómo estás hoy" -o test-audio/spanish/hola.aiff
    say "Buenos días, mucho gusto" -o test-audio/spanish/morning.aiff
fi

echo "🗣️ Generating Portuguese test audio..."
# Check if Portuguese voice is available
if say -v ? | grep -q "Luciana\|Joana"; then
    PORTUGUESE_VOICE="Luciana"
    if ! say -v ? | grep -q "Luciana"; then
        PORTUGUESE_VOICE="Joana"
    fi
    echo "Using Portuguese voice: $PORTUGUESE_VOICE"
    
    say "Olá, como você está hoje?" -v $PORTUGUESE_VOICE -o test-audio/portuguese/ola.aiff
    say "Bom dia, muito prazer" -v $PORTUGUESE_VOICE -o test-audio/portuguese/morning.aiff
    say "Você pode me ajudar com direções?" -v $PORTUGUESE_VOICE -o test-audio/portuguese/direcoes.aiff
    say "Muito obrigado pela sua ajuda" -v $PORTUGUESE_VOICE -o test-audio/portuguese/obrigado.aiff
    say "Que horas são agora?" -v $PORTUGUESE_VOICE -o test-audio/portuguese/horas.aiff
else
    echo "⚠️ Portuguese voice not found, using default voice"
    say "Olá, como você está hoje" -o test-audio/portuguese/ola.aiff
    say "Bom dia, muito prazer" -o test-audio/portuguese/morning.aiff
fi

echo ""
echo "✅ Test audio files created successfully!"
echo ""
echo "📁 Generated files:"
find test-audio -name "*.aiff" | sort

echo ""
echo "🧪 Usage in Playwright tests:"
echo "const audioFile = 'test-audio/english/hello.aiff'"
echo "await page.setInputFiles('input[type=file]', audioFile)"
echo ""
echo "💡 Convert to WAV if needed:"
echo "ffmpeg -i test-audio/english/hello.aiff test-audio/english/hello.wav"
echo ""
echo "🎯 Ready for testing with:"
echo "npx playwright test tests/core-user-experience.spec.ts"