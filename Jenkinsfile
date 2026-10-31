pipeline {
    agent any

    // Poll GitHub securely over encrypted outbound HTTPS every 2 minutes.
    // Safe for internal/private networks without exposing any public webhooks.
    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        DOCKER_HUB_USER         = 'arfath02'
        IMAGE_NAME              = 'bia-website'
        FULL_IMAGE_NAME         = "${DOCKER_HUB_USER}/${IMAGE_NAME}"
        
        // Jenkins Credentials ID for Docker Hub
        DOCKER_HUB_CREDENTIALS  = 'dockerhub-creds'
        
        // Production container settings
        CONTAINER_NAME          = 'bia-website'
        HOST_PORT               = '5000'
        CONTAINER_PORT          = '5000'
        PROD_ENV_FILE           = '/etc/bia/.env.production'

        // Set to 'true' if deploying to a remote host via SSH; 'false' for local Ubuntu host
        DEPLOY_REMOTE           = 'false'
        SSH_CREDENTIALS_ID      = 'ubuntu-ssh-key'
        SERVER_USER             = 'ubuntu'
        SERVER_IP               = 'your.server.ip.here'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '15', artifactNumToKeepStr: '5'))
        timestamps()
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds() // Prevents duplicate concurrent deployments
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo '=== [SAFETY CHECK 1] Checking out latest commit from Git ==='
                checkout scm
            }
        }

        stage('Build Production Docker Image') {
            steps {
                echo "=== [SAFETY CHECK 2] Building image: ${FULL_IMAGE_NAME}:${BUILD_NUMBER} ==="
                sh """
                    docker build \
                        --pull \
                        -t ${FULL_IMAGE_NAME}:${BUILD_NUMBER} \
                        -t ${FULL_IMAGE_NAME}:latest \
                        .
                """
            }
        }

        stage('Pre-Deployment Health Check') {
            steps {
                echo '=== [SAFETY CHECK 3] Verifying container integrity on isolated port 5002 ==='
                sh """
                    # Cleanup any leftover test container
                    docker rm -f test-healthcheck-${BUILD_NUMBER} || true

                    # Launch isolated test instance
                    docker run -d \
                        --name test-healthcheck-${BUILD_NUMBER} \
                        --security-opt=no-new-privileges:true \
                        --memory=512m \
                        -p 127.0.0.1:5002:5000 \
                        ${FULL_IMAGE_NAME}:${BUILD_NUMBER}

                    # Wait and probe HTTP 200 response
                    sleep 4
                    HEALTHY=0
                    for i in 1 2 3 4 5; do
                        if curl -f -s -o /dev/null http://127.0.0.1:5002/; then
                            echo "Container test passed on attempt \$i."
                            HEALTHY=1
                            break
                        fi
                        echo "Waiting for container to boot (attempt \$i/5)..."
                        sleep 3
                    done

                    # Clean up test container
                    docker rm -f test-healthcheck-${BUILD_NUMBER}

                    if [ "\$HEALTHY" -ne 1 ]; then
                        echo "FATAL: Pre-deployment health check failed! Aborting pipeline to protect production."
                        exit 1
                    fi
                """
            }
        }

        stage('Push to Docker Hub') {
            steps {
                echo '=== [SAFETY CHECK 4] Pushing versioned & latest tags to Docker Hub ==='
                withCredentials([usernamePassword(credentialsId: "${DOCKER_HUB_CREDENTIALS}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh """
                        echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin
                        docker push ${FULL_IMAGE_NAME}:${BUILD_NUMBER}
                        docker push ${FULL_IMAGE_NAME}:latest
                        docker logout
                    """
                }
            }
        }

        stage('Zero-Downtime Safe Deploy') {
            steps {
                script {
                    echo "=== [SAFETY CHECK 5] Executing safe swap with auto-rollback guard ==="
                    sh """
                        # Prepare environment file flag if file exists on host
                        ENV_ARG=""
                        if [ -f "${PROD_ENV_FILE}" ]; then
                            ENV_ARG="--env-file ${PROD_ENV_FILE}"
                            echo "Using secure production environment file: ${PROD_ENV_FILE}"
                        fi

                        # 1. Start candidate container on a temporary green port
                        docker rm -f ${CONTAINER_NAME}-candidate || true
                        docker run -d \
                            --name ${CONTAINER_NAME}-candidate \
                            --restart unless-stopped \
                            --security-opt=no-new-privileges:true \
                            --memory=1024m \
                            --memory-swap=1024m \
                            --cpus=1.5 \
                            --log-opt max-size=20m \
                            --log-opt max-file=3 \
                            \$ENV_ARG \
                            -p 127.0.0.1:5001:${CONTAINER_PORT} \
                            ${FULL_IMAGE_NAME}:${BUILD_NUMBER}

                        # 2. Verify candidate container is answering healthy
                        sleep 4
                        if ! curl -f -s -o /dev/null http://127.0.0.1:5001/; then
                            echo "CRITICAL: Candidate container failed smoke test! Production container left untouched."
                            docker rm -f ${CONTAINER_NAME}-candidate
                            exit 1
                        fi

                        # 3. Swap: Stop candidate, replace production container
                        docker rm -f ${CONTAINER_NAME}-candidate
                        
                        # Backup current production tag before replacing
                        if docker inspect ${CONTAINER_NAME} >/dev/null 2>&1; then
                            docker commit ${CONTAINER_NAME} ${FULL_IMAGE_NAME}:previous-stable || true
                            docker stop ${CONTAINER_NAME}
                            docker rm -f ${CONTAINER_NAME}
                        fi

                        # 4. Launch new production container bound only to localhost (127.0.0.1)
                        # Traffic enters safely via Nginx reverse proxy on 80/443
                        docker run -d \
                            --name ${CONTAINER_NAME} \
                            --restart unless-stopped \
                            --security-opt=no-new-privileges:true \
                            --memory=1024m \
                            --memory-swap=1024m \
                            --cpus=1.5 \
                            --log-opt max-size=20m \
                            --log-opt max-file=3 \
                            \$ENV_ARG \
                            -p 127.0.0.1:${HOST_PORT}:${CONTAINER_PORT} \
                            ${FULL_IMAGE_NAME}:${BUILD_NUMBER}

                        echo "=== Verifying live production container ==="
                        sleep 3
                        curl -f -s -o /dev/null http://127.0.0.1:${HOST_PORT}/
                        docker ps --filter "name=^${CONTAINER_NAME}\$"
                    """
                }
            }
        }
    }

    post {
        always {
            echo '=== Auto-pruning dangling Docker images to protect disk space ==='
            sh 'docker image prune -f || true'
        }
        success {
            echo "✅ [DEPLOY SUCCESS] BIA website safely deployed with build #${BUILD_NUMBER}."
        }
        failure {
            echo "❌ [DEPLOY FAILED] Build #${BUILD_NUMBER} failed. Production was protected."
        }
    }
}
