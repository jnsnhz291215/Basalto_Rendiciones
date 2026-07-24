#!/bin/bash

# Detener el script si ocurre algún error
set -e

echo "1/5. Descargando cambios de Git..."
git pull

echo "2/5. Actualizando e instalando Frontend (Vue)..."
npm install
# Same-origin en prod: no embeber localhost:3002 en el build
VITE_API_BASE_URL=https://rendiciones.basalto.app npm run build

echo "3/5. Actualizando Backend (Express)..."
cd server
npm install
# El API también sirve dist/ (front)
pm2 restart basalto_rendiciones_api

pm2 restart basalto_rendiciones 2>/dev/null || echo "(omitido: basalto_rendiciones no está en PM2)"

echo "¡Listo! Aplicación actualizada correctamente."
