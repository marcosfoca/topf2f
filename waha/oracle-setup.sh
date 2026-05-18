#!/bin/bash
# Script de configuración automática de Oracle Cloud para WAHA
set -e

echo "==> Obteniendo datos de la cuenta..."
TENANCY_ID=$OCI_TENANCY
AD=$(oci iam availability-domain list --compartment-id $TENANCY_ID --query "data[0].name" --raw-output)
echo "    Tenancy: $TENANCY_ID"
echo "    AD: $AD"

echo "==> Creando VCN..."
VCN_ID=$(oci network vcn create \
  --compartment-id $TENANCY_ID \
  --cidr-block "10.0.0.0/16" \
  --display-name "vcn-topf2f" \
  --dns-label "vcntopf2f" \
  --query "data.id" --raw-output)
echo "    VCN: $VCN_ID"

echo "==> Creando Internet Gateway..."
IGW_ID=$(oci network internet-gateway create \
  --compartment-id $TENANCY_ID \
  --vcn-id $VCN_ID \
  --is-enabled true \
  --display-name "igw-topf2f" \
  --query "data.id" --raw-output)

echo "==> Configurando tabla de rutas..."
RT_ID=$(oci network route-table list \
  --compartment-id $TENANCY_ID \
  --vcn-id $VCN_ID \
  --query "data[0].id" --raw-output)
oci network route-table update \
  --rt-id $RT_ID \
  --route-rules "[{\"cidrBlock\":\"0.0.0.0/0\",\"networkEntityId\":\"$IGW_ID\"}]" \
  --force > /dev/null

echo "==> Abriendo puertos 22 (SSH) y 3000 (WAHA)..."
SL_ID=$(oci network security-list list \
  --compartment-id $TENANCY_ID \
  --vcn-id $VCN_ID \
  --query "data[0].id" --raw-output)
oci network security-list update \
  --security-list-id $SL_ID \
  --ingress-security-rules "[
    {\"protocol\":\"6\",\"source\":\"0.0.0.0/0\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":22,\"max\":22}}},
    {\"protocol\":\"6\",\"source\":\"0.0.0.0/0\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":3000,\"max\":3000}}}
  ]" \
  --force > /dev/null

echo "==> Creando subnet pública..."
SUBNET_ID=$(oci network subnet create \
  --compartment-id $TENANCY_ID \
  --vcn-id $VCN_ID \
  --cidr-block "10.0.0.0/24" \
  --display-name "subnet-topf2f" \
  --dns-label "subnetpublic" \
  --route-table-id $RT_ID \
  --security-list-ids "[\"$SL_ID\"]" \
  --query "data.id" --raw-output)
echo "    Subnet: $SUBNET_ID"

echo "==> Buscando imagen Ubuntu 20.04 ARM..."
IMAGE_ID=$(oci compute image list \
  --compartment-id $TENANCY_ID \
  --operating-system "Canonical Ubuntu" \
  --operating-system-version "20.04" \
  --shape "VM.Standard.A1.Flex" \
  --sort-by TIMECREATED \
  --sort-order DESC \
  --query "data[0].id" --raw-output)
echo "    Image: $IMAGE_ID"

echo "==> Creando VM (VM.Standard.A1.Flex, 1 OCPU, 6GB RAM)..."
SSH_KEY="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDlaZ+k1RTVYBP7lgC9MGEdqEEWfZn2xVAaPFWB91QqzcXMe3Ik9XLHFP4uUKeMbwGccKMK8R+jlkS+/2Dj8ySfeU4nGoHbuKkh9LYwtuN9aWOdPx3xE0mJBdGabLqsn1gSLARlTdcq3XPhmGo6Nwnm5kOQoZ8lw7abTtrq50Wwsz0lovOjc8UAIA0fHVE8M49zD9sPbQmZjeO+ZpmxFB0nNbkwrLvsXRzQ4KizPe1TvfB3aMOGQG0IAgp50JNzp0q8jhnYgK15vay3rouiyQp2ZY8sMbXcssiT3o0mK+pL1EUz7kSocuhSSmGiAmQz1JPDnjoYS0dgWv74Lm0jfWVz ssh-key-2026-05-18"

INSTANCE_ID=$(oci compute instance launch \
  --compartment-id $TENANCY_ID \
  --availability-domain $AD \
  --shape "VM.Standard.A1.Flex" \
  --shape-config '{"ocpus":1,"memoryInGBs":6}' \
  --image-id $IMAGE_ID \
  --subnet-id $SUBNET_ID \
  --assign-public-ip true \
  --ssh-authorized-keys-file <(echo "$SSH_KEY") \
  --display-name "topf2f-waha" \
  --query "data.id" --raw-output)
echo "    Instance: $INSTANCE_ID"

echo "==> Esperando a que la VM arranque (puede tardar 2 min)..."
while true; do
  STATE=$(oci compute instance get --instance-id $INSTANCE_ID --query "data.\"lifecycle-state\"" --raw-output)
  echo "    Estado: $STATE"
  if [ "$STATE" = "RUNNING" ]; then break; fi
  sleep 15
done

echo "==> Obteniendo IP pública..."
sleep 10
PUBLIC_IP=$(oci compute instance list-vnics \
  --instance-id $INSTANCE_ID \
  --query "data[0].\"public-ip\"" --raw-output)

echo ""
echo "============================================"
echo "  VM creada con éxito!"
echo "  IP pública: $PUBLIC_IP"
echo "  Conéctate con:"
echo "  ssh -i ssh-key-2026-05-18.key ubuntu@$PUBLIC_IP"
echo "============================================"
