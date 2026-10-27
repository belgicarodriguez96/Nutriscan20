# NutriScan 20 — MVP para Android

## Qué incluye
- Aplicación web adaptable, preparada como PWA instalable en Android cuando se sirve por HTTPS.
- Búsqueda de alimentos envasados mediante código de barras y consulta a Open Food Facts.
- Escáner de cámara en navegadores compatibles con `BarcodeDetector`.
- Análisis manual con ingredientes y datos nutricionales.
- Catálogo inicial de alimentos frescos con valores nutricionales aproximados por 100 g.
- Diseño en español, orientado a Chile.

## Probar en un computador
No basta con abrir `index.html` con doble clic para probar cámara/PWA. Desde esta carpeta ejecuta:

```bash
python -m http.server 8080
```

Abre `http://localhost:8080`. La cámara puede depender del navegador.

## Instalar en Android
1. Publica los archivos en un hosting HTTPS (por ejemplo, GitHub Pages, Cloudflare Pages o Netlify).
2. Abre la URL con Chrome en Android.
3. Usa el menú de Chrome → **Instalar aplicación** o **Añadir a pantalla de inicio**.
4. Para una app APK nativa publicada en Google Play, habrá que empaquetarla con Capacitor o crear una app Android nativa y completar pruebas y firma.

## Limitaciones que deben resolverse antes de lanzar
- La puntuación actual es una heurística de demostración, NO un método validado clínicamente ni un Nutri-Score oficial. No debe usarse para diagnóstico o recomendaciones médicas individualizadas.
- El catálogo de frescos es una selección inicial; valores aproximados y variables según preparación.
- Open Food Facts es colaborativo y puede tener datos incompletos o desactualizados; comprobar siempre la etiqueta real.
- El acceso a la cámara requiere permisos y soporte de `BarcodeDetector`. Para compatibilidad amplia, añadir una librería de lectura de códigos como ZXing.
- La PWA necesita HTTPS para instalarse fuera de localhost. El modo offline solo guarda la interfaz; la búsqueda de productos requiere conexión.
- Antes de uso público: validar algoritmo con profesionales de nutrición, añadir categorías de alimentos, alergias y advertencias cuidadosas, privacidad, pruebas de seguridad y accesibilidad.

## Siguiente hito recomendado
Validar el sistema de puntuación con una matriz nutricional por categoría (bebidas, cereales, lácteos, snacks, conservas, etc.) y separar claramente “calidad nutricional”, “nivel de procesamiento” y “alérgenos”.