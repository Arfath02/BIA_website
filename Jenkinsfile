pipeline {
    agent any

    environment {
        // Change 'arfath02' to your actual Docker Hub username if different
        DOCKER_HUB_USER         = 'arfath02'
        IMAGE_NAME              = 'bia-website'
        FULL_IMAGE_NAME         = "${DOCKER_HUB_USER}/${IMAGE_NAME}"
        
        // Jenkins Credentials ID for Docker Hub (created in Jenkins Dashboard -> Manage Credentials)
        DOCKER_HUB_CREDENTIALS  = 'dockerhub-creds'
        
        // Deployment configuration
        CONTAINER_NAME          = 'bia-website'
        HOST_PORT               = '5000'
        CONTAINER_PORT          = '5000'

        // Set to 'true' if deploying to a separate remote Ubuntu server via SSH;
        // set to 'false' if Jenkins is installed on the same Ubuntu host.
        DEPLOY_REMOTE           = 'false'
        SSH_CREDENTIALS_ID      = 'ubuntu-ssh-key'
        SERVER_USER             = 'ubuntu'
        SERVER_IP               = 'your.server.ip.here'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
    }

    stages {
        stage('Checkout Code') {
            steps {
                echo '=== Checking out repository from GitHub ==='
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "=== Building Docker image: ${FULL_IMAGE_NAME}:${BUILD_NUMBER} ==="
                sh """
                    docker build \
                        -t ${FULL_IMAGE_NAME}:${BUILD_NUMBER} \
                        -t ${FULL_IMAGE_NAME}:latest \
                        .
                """
            }
        }

        stage('Sanity Test Container') {
            steps {
                echo '=== Running container sanity health check ==='
                sh """
                    # Spin up temporary container for sanity check
                    docker run -d --name test-${BUILD_NUMBER} -p 5001:5000 ${FULL_IMAGE_NAME}:${BUILD_NUMBER}
                    sleep 5
                    
                    # Verify HTTP response
                    curl -f http://localhost:5001/ || (docker logs test-${BUILD_NUMBER} && exit 1)
                    
                    # Teardown test container
                    docker rm -f test-${BUILD_NUMBER}
                """
            }
        }

        stage('Push to Docker Hub') {
            steps {
                echo '=== Authenticating with Docker Hub and pushing image ==='
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

        stage('Deploy to Ubuntu Server') {
            steps {
                script {
                    if (env.DEPLOY_REMOTE == 'true') {
                        echo "=== Deploying to remote Ubuntu server (${SERVER_IP}) via SSH ==="
                        sshagent([env.SSH_CREDENTIALS_ID]) {
                            sh """
                                ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "
                                    echo 'Logging in to Docker Hub on server...'
                                    docker pull ${FULL_IMAGE_NAME}:latest
                                    docker stop ${CONTAINER_NAME} || true
                                    docker rm -f ${CONTAINER_NAME} || true
                                    docker run -d \\
                                        --name ${CONTAINER_NAME} \\
                                        --restart unless-stopped \\
                                        -p ${HOST_PORT}:${CONTAINER_PORT} \\
                                        ${FULL_IMAGE_NAME}:latest
                                    docker image prune -f
                                "
                            """
                        }
                    } else {
                        echo "=== Deploying locally on Ubuntu host running Jenkins ==="
                        sh """
                            echo 'Stopping previous container if running...'
                            docker stop ${CONTAINER_NAME} || true
                            docker rm -f ${CONTAINER_NAME} || true
                            
                            echo 'Starting newly built container...'
                            docker run -d \
                                --name ${CONTAINER_NAME} \
                                --restart unless-stopped \
                                -p ${HOST_PORT}:${CONTAINER_PORT} \
                                ${FULL_IMAGE_NAME}:latest

                            echo 'Verifying deployment status...'
                            sleep 4
                            docker ps --filter "name=${CONTAINER_NAME}"
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            echo '=== Cleaning up dangling Docker images ==='
            sh 'docker image prune -f || true'
        }
        success {
            echo "🎉 Pipeline Succeeded! BIA website deployed successfully at http://<server-ip>:${HOST_PORT}"
        }
        failure {
            echo "❌ Pipeline Failed! Please inspect Jenkins console output for details."
        }
    }
}
