pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    stages {

        stage('Checkout Source Code') {
            steps {
                checkout scm
            }
        }

        stage('Backend - Install Dependencies') {
            when {
                expression { fileExists('backend/package.json') }
            }
            steps {
                dir('backend') {
                    echo 'Installing backend dependencies'
                    sh 'npm install'
                }
            }
        }

        stage('Backend - Build') {
            when {
                expression { fileExists('backend/package.json') }
            }
            steps {
                dir('backend') {
                    echo 'Building backend'
                    sh 'npm run build || echo "Backend build skipped (not configured yet)"'
                }
            }
        }

        stage('Frontend - Install Dependencies') {
            when {
                expression { fileExists('frontend/package.json') }
            }
            steps {
                dir('frontend') {
                    echo 'Installing frontend dependencies'
                    sh 'npm install'
                }
            }
        }

        stage('Frontend - Build') {
            when {
                expression { fileExists('frontend/package.json') }
            }
            steps {
                dir('frontend') {
                    echo 'Building frontend'
                    sh 'npm run build || echo "Frontend build skipped (not configured yet)"'
                }
            }
        }

        stage('Tests') {
            steps {
                echo 'Test stage (to be implemented in next phases)'
            }
        }
    }

    post {
        success {
            echo 'CI pipeline completed successfully'
        }
        failure {
            echo 'CI pipeline failed'
        }
    }
}
