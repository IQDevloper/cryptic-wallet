import { TransactionMonitor } from './transaction-monitor'

// Initialize services when the application starts
export function initializeServices() {
  console.log('🚀 Initializing Cryptic Gateway services...')
  
  // Start transaction monitoring
  const monitor = TransactionMonitor.getInstance()
  monitor.startMonitoring()
  
  console.log('✅ Services initialized successfully')
}

// Cleanup services when the application shuts down
export function cleanupServices() {
  console.log('🔄 Cleaning up services...')
  
  const monitor = TransactionMonitor.getInstance()
  monitor.stopMonitoring()
  
  console.log('✅ Services cleaned up')
}

// Handle process termination
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    cleanupServices()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    cleanupServices()
    process.exit(0)
  })
}