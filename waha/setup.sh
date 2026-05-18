#!/bin/bash
# Script de instalación para VM Oracle Cloud (Ubuntu)
set -e

echo "==> Instalando Docker..."
apt-get update -y
apt-get install -y docker.io docker-compose-plugin
systemctl enable docker
systemctl start docker

echo "==> Abriendo puerto 3000 en el firewall del sistema..."
iptables -I INPUT -p tcp --dport 3000 -j ACCEPT

# Hacer la regla persistente
apt-get install -y iptables-persistent
netfilter-persistent save

echo "==> Docker instalado correctamente."
echo "==> Ahora crea el archivo .env y ejecuta: docker compose up -d"
