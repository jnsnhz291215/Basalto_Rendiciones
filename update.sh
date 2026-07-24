#!/bin/bash

# Detener el script si ocurre algún error
set -e

echo "1/5. Descargando cambios de Git..."
git pull

echo "2/5. Actualizando e instalando Frontend (Vue)..."
npm install
npm run build
pm2 restart basalto_rendiciones

echo "3/5. Actualizando Backend (Express)..."
cd server
npm install
pm2 restart basalto_rendiciones_api

echo "¡Listo! Aplicación actualizada correctamente."
