#!/bin/bash

# KMS Management Script
# Simplified version of the existing kms-setup.sh with Docker integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check Docker installation
check_docker() {
    log_info "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker first."
        exit 1
    fi
    log_success "Docker is available"
}

# Create directories
create_directories() {
    log_info "Creating KMS directories..."
    mkdir -p kms-data kms-logs kms-backups
    chmod 700 kms-data kms-backups
    log_success "Directories created"
}

# Check environment file
check_env() {
    if [ ! -f .env.kms ]; then
        log_error ".env.kms file not found!"
        log_info "Please create .env.kms with your Tatum API key and KMS password"
        exit 1
    fi
    log_success "Environment file found"
}

# Pull KMS image
pull_image() {
    log_info "Pulling Tatum KMS Docker image..."
    docker pull tatumio/tatum-kms:latest
    log_success "KMS image updated"
}

# Initialize wallets
init_wallets() {
    log_info "Initializing KMS wallets..."
    
    # Check if we should use testnet
    TESTNET_FLAG=""
    if [[ "$1" == "--testnet" ]]; then
        TESTNET_FLAG="--testnet"
        log_warning "Using TESTNET mode"
    fi
    
    # Run the wallet initialization script
    node scripts/init-kms-wallets.js $TESTNET_FLAG
    
    log_success "Wallet initialization completed"
}

# Start KMS daemon
start_daemon() {
    log_info "Starting KMS daemon..."
    docker-compose -f docker-compose.kms.yml up -d
    
    if [ $? -eq 0 ]; then
        log_success "KMS daemon started"
        sleep 3
        show_logs
    else
        log_error "Failed to start KMS daemon"
        exit 1
    fi
}

# Stop KMS daemon
stop_daemon() {
    log_info "Stopping KMS daemon..."
    docker-compose -f docker-compose.kms.yml down
    log_success "KMS daemon stopped"
}

# Show KMS logs
show_logs() {
    log_info "Recent KMS logs:"
    echo "-----------------------------------"
    docker-compose -f docker-compose.kms.yml logs --tail=20
}

# Show status
show_status() {
    echo ""
    echo "==================================="
    echo "  🔐 TATUM KMS STATUS"
    echo "==================================="
    docker-compose -f docker-compose.kms.yml ps
    echo ""
    show_logs
}

# Backup KMS data
backup_data() {
    log_info "Creating KMS backup..."
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_file="kms-backups/kms-backup-${timestamp}.tar.gz"
    
    tar -czf "$backup_file" kms-data/
    
    if [ $? -eq 0 ]; then
        log_success "Backup created: $backup_file"
        log_warning "IMPORTANT: Store this backup securely!"
    else
        log_error "Failed to create backup"
    fi
}

# Export wallets (for debugging)
export_wallets() {
    log_info "Exporting wallet information..."
    docker run -it --rm \
        --env-file .env.kms \
        -v $(pwd)/kms-data:/root/.tatumrc \
        tatumio/tatum-kms:latest \
        export
}

# Show menu
show_menu() {
    echo ""
    echo "==================================="
    echo "  🔐 CRYPTIC KMS MANAGER"
    echo "==================================="
    echo "1. Complete Setup (Pull + Init + Start)"
    echo "2. Initialize Wallets (Mainnet)"
    echo "3. Initialize Wallets (Testnet)"
    echo "4. Start KMS Daemon"
    echo "5. Stop KMS Daemon"
    echo "6. Restart KMS Daemon"
    echo "7. Show Status & Logs"
    echo "8. Export Wallet Info"
    echo "9. Create Backup"
    echo "10. Pull Latest KMS Image"
    echo "11. Exit"
    echo "==================================="
}

# Handle menu selections
handle_selection() {
    case $1 in
        1)
            log_info "Starting complete KMS setup..."
            check_docker
            check_env
            create_directories
            pull_image
            init_wallets
            start_daemon
            backup_data
            log_success "Complete setup finished!"
            ;;
        2)
            init_wallets
            ;;
        3)
            init_wallets --testnet
            ;;
        4)
            start_daemon
            ;;
        5)
            stop_daemon
            ;;
        6)
            stop_daemon
            sleep 2
            start_daemon
            ;;
        7)
            show_status
            ;;
        8)
            export_wallets
            ;;
        9)
            backup_data
            ;;
        10)
            pull_image
            ;;
        11)
            log_info "Exiting KMS Manager"
            exit 0
            ;;
        *)
            log_error "Invalid selection"
            ;;
    esac
}

# Main execution
main() {
    if [ $# -eq 1 ]; then
        handle_selection $1
    else
        while true; do
            show_menu
            read -p "Select an option (1-11): " choice
            handle_selection $choice
            echo ""
            read -p "Press Enter to continue..."
        done
    fi
}

# Run main function
main "$@"