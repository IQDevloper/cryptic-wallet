#!/bin/bash
# Tatum KMS Setup and Management Script
# This script handles the complete KMS setup process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    log_info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker service."
        exit 1
    fi
    
    log_success "Docker is installed and running"
}

# Pull Tatum KMS Docker image
pull_kms_image() {
    log_info "Pulling Tatum KMS Docker image..."
    docker pull tatumio/tatum-kms:latest
    log_success "Tatum KMS image pulled successfully"
}

# Create necessary directories
create_directories() {
    log_info "Creating KMS directories..."
    
    mkdir -p kms-data
    mkdir -p kms-logs
    mkdir -p kms-backups
    
    # Set proper permissions
    chmod 700 kms-data
    chmod 755 kms-logs
    chmod 700 kms-backups
    
    log_success "KMS directories created"
}

# Generate KMS password if not set
generate_kms_password() {
    if [ ! -f .env.kms ]; then
        log_error ".env.kms file not found. Please create it first."
        exit 1
    fi
    
    # Check if password is set
    if grep -q "KMS_PASSWORD=your-super-secure-kms-password-here-change-in-production" .env.kms; then
        log_warning "Generating secure KMS password..."
        
        # Generate a strong password
        KMS_PASSWORD=$(openssl rand -base64 32)
        
        # Update the .env.kms file
        sed -i.bak "s/KMS_PASSWORD=your-super-secure-kms-password-here-change-in-production/KMS_PASSWORD=${KMS_PASSWORD}/" .env.kms
        
        log_success "KMS password generated and updated in .env.kms"
        log_warning "IMPORTANT: Backup this password securely!"
    else
        log_info "KMS password already configured"
    fi
}

# Generate wallets for each supported network
generate_wallets() {
    log_info "Generating managed wallets in KMS..."
    
    # List of supported networks from your crypto-assets-config
    declare -a networks=(
        "BTC:bitcoin"
        "ETH:ethereum" 
        "USDT:ethereum"
        "USDC:ethereum"
        "MATIC:polygon"
        "BNB:bsc"
        "SOL:solana"
        "LTC:litecoin"
        "DOGE:dogecoin"
        "DASH:dash"
        "TRX:tron"
    )
    
    # Create wallets for mainnet
    for network_pair in "${networks[@]}"; do
        IFS=':' read -r currency chain <<< "$network_pair"
        
        log_info "Generating ${currency} wallet on ${chain}..."
        
        # Run KMS wallet generation
        docker run -it --rm \
            --env-file .env.kms \
            -v $(pwd)/kms-data:/root/.tatumrc \
            tatumio/tatum-kms generatemanagedwallet ${chain} --mainnet
        
        if [ $? -eq 0 ]; then
            log_success "${currency} wallet generated successfully"
        else
            log_error "Failed to generate ${currency} wallet"
        fi
    done
}

# Start KMS daemon
start_kms_daemon() {
    log_info "Starting KMS daemon..."
    
    # Start with Docker Compose
    docker-compose -f docker-compose.kms.yml up -d
    
    if [ $? -eq 0 ]; then
        log_success "KMS daemon started successfully"
        log_info "KMS is now running and will automatically sign transactions"
    else
        log_error "Failed to start KMS daemon"
        exit 1
    fi
}

# Check KMS health
check_kms_health() {
    log_info "Checking KMS health..."
    
    # Wait a moment for startup
    sleep 5
    
    # Check if container is running
    if docker-compose -f docker-compose.kms.yml ps | grep -q "Up"; then
        log_success "KMS daemon is running"
    else
        log_error "KMS daemon is not running"
        exit 1
    fi
}

# Backup KMS wallet data
backup_kms_data() {
    log_info "Creating KMS backup..."
    
    timestamp=$(date +"%Y%m%d_%H%M%S")
    backup_file="kms-backups/kms-backup-${timestamp}.tar.gz"
    
    tar -czf "${backup_file}" kms-data/
    
    if [ $? -eq 0 ]; then
        log_success "KMS backup created: ${backup_file}"
        log_warning "IMPORTANT: Store this backup in a secure location!"
    else
        log_error "Failed to create KMS backup"
    fi
}

# Display KMS status
show_status() {
    echo ""
    echo "==================================="
    echo "  🔐 TATUM KMS STATUS"
    echo "==================================="
    
    # Show container status
    docker-compose -f docker-compose.kms.yml ps
    
    # Show logs (last 10 lines)
    echo ""
    echo "Recent KMS logs:"
    echo "-----------------------------------"
    docker-compose -f docker-compose.kms.yml logs --tail=10
}

# Main menu
show_menu() {
    echo ""
    echo "==================================="
    echo "  🔐 TATUM KMS MANAGEMENT"
    echo "==================================="
    echo "1. Complete KMS Setup"
    echo "2. Generate Wallets Only"
    echo "3. Start KMS Daemon"
    echo "4. Stop KMS Daemon" 
    echo "5. Restart KMS Daemon"
    echo "6. Show Status"
    echo "7. Create Backup"
    echo "8. View Logs"
    echo "9. Exit"
    echo "==================================="
}

# Handle menu selection
handle_menu() {
    case $1 in
        1)
            log_info "Starting complete KMS setup..."
            check_docker
            create_directories
            generate_kms_password
            pull_kms_image
            generate_wallets
            start_kms_daemon
            check_kms_health
            backup_kms_data
            show_status
            log_success "KMS setup completed successfully!"
            ;;
        2)
            generate_wallets
            ;;
        3)
            start_kms_daemon
            check_kms_health
            ;;
        4)
            log_info "Stopping KMS daemon..."
            docker-compose -f docker-compose.kms.yml down
            log_success "KMS daemon stopped"
            ;;
        5)
            log_info "Restarting KMS daemon..."
            docker-compose -f docker-compose.kms.yml restart
            log_success "KMS daemon restarted"
            ;;
        6)
            show_status
            ;;
        7)
            backup_kms_data
            ;;
        8)
            docker-compose -f docker-compose.kms.yml logs -f
            ;;
        9)
            log_info "Exiting KMS management"
            exit 0
            ;;
        *)
            log_error "Invalid option"
            ;;
    esac
}

# Main execution
main() {
    # Check if running with argument
    if [ $# -eq 1 ]; then
        handle_menu $1
    else
        # Interactive mode
        while true; do
            show_menu
            read -p "Select an option (1-9): " choice
            handle_menu $choice
            echo ""
            read -p "Press Enter to continue..."
        done
    fi
}

# Run main function
main "$@"