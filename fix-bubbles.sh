#!/bin/bash

echo "🔧 Fixing FloatingBubble.tsx..."

# Modifica il file per usare la nuova classe .gentle-float
sed -i 's/float-bubble-${delay}/gentle-float delay-${delay}/' src/components/FloatingBubble.tsx

echo "✅ Patched FloatingBubble.tsx"

# Controlla dove si trova il file CSS principale
CSS_FILE="src/index.css"
if [ ! -f "$CSS_FILE" ]; then
  CSS_FILE="src/App.css"
fi

echo "🎨 Updating $CSS_FILE..."

# Aggiungi animazioni CSS in fondo al file
cat <<EOF >> "$CSS_FILE"

@keyframes gentleFloat {
  0% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0); }
}

.gentle-float {
  animation: gentleFloat 12s ease-in-out infinite;
}

.delay-1 { animation-delay: 0s; }
.delay-2 { animation-delay: 2s; }
.delay-3 { animation-delay: 4s; }
EOF

echo "✅ Animazioni aggiunte a $CSS_FILE"

# Commit e push
git add src/components/FloatingBubble.tsx "$CSS_FILE"
git commit -m "fix: bolle fluttuanti più lente e smooth"
git push

echo "🚀 Fix completato e pushato su GitHub!"

