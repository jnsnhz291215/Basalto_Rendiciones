#!/bin/bash

# Detener el script si ocurre algún error
set -e

echo "1/5. Descargando cambios de Git..."
git pull

echo "2/5. Actualizando e instalando Frontend (Vue)..."
npm install
npm run build

echo "3/5. Actualizando Backend (Express)..."
cd server
npm install
# El API ahora también sirve dist/ (front). Reiniciar API es obligatorio.
pm2 restart basalto_rendiciones_api

# Proceso front aparte (si existe en PM2); no falla el script si no está
pm2 restart basalto_rendiciones 2>/dev/null || echo "(omitido: basalto_rendiciones no está en PM2)"

echo "¡Listo! Aplicación actualizada correctamente."
