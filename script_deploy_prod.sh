ssh -o StrictHostKeyChecking=no -i id_rsa.pem $SERVER_USER_PROD@$SERVER_IP_PROD "./script_deploy.sh"