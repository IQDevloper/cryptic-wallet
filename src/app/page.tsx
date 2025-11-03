import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowRight, Shield, Zap, Globe, CheckCircle, Bitcoin, Smartphone, BarChart3 } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Bitcoin className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">Cryptic Gateway</span>
        </div>
        <div className="hidden md:flex items-center space-x-8">
          <Link href="#features" className="text-muted-foreground hover:text-foreground">Features</Link>
          <Link href="#how-it-works" className="text-muted-foreground hover:text-foreground">How it Works</Link>
          <Link href="#pricing" className="text-muted-foreground hover:text-foreground">Pricing</Link>
          <Link href="/docs" className="text-muted-foreground hover:text-foreground">Docs</Link>
          <ThemeToggle />
          <Link href="/login">
            <Button variant="outline">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge variant="secondary" className="mb-6">
          🚀 Powered by Tatum API
        </Badge>
        <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
          Accept Crypto Payments
          <span className="block text-blue-600 dark:text-blue-400">Without the Complexity</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          Professional cryptocurrency payment gateway for businesses. Accept Bitcoin, Ethereum, and stablecoins
          across multiple blockchains with enterprise-grade security and real-time processing.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/register">
            <Button size="lg" className="text-lg px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white">
              Start Accepting Crypto
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="text-lg px-8 py-4">
              View Live Demo
            </Button>
          </Link>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center items-center gap-8 text-muted-foreground mb-16">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span>Enterprise Security</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span>Instant Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            <span>Multi-Chain Support</span>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="relative max-w-5xl mx-auto">
          <div className="bg-card rounded-2xl shadow-2xl border overflow-hidden">
            <div className="bg-muted px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="ml-4 text-sm text-muted-foreground">dashboard.crypticgateway.com</span>
              </div>
            </div>
            <div className="p-8 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-slate-800/50 dark:to-slate-700/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Total Revenue</span>
                      <BarChart3 className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">$24,680</div>
                    <div className="text-sm text-green-600">+12.5% this month</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Transactions</span>
                      <Zap className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">1,247</div>
                    <div className="text-sm text-blue-600">+8.2% this week</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Success Rate</span>
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">99.8%</div>
                    <div className="text-sm text-emerald-600">Industry leading</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-card py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything you need to accept crypto
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for businesses of all sizes, from startups to enterprises
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Bitcoin className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Multi-Chain Support</h3>
                <p className="text-muted-foreground mb-4">
                  Accept Bitcoin, Ethereum, BNB, TRON, Polygon, and major stablecoins across 8+ networks
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Bitcoin & Bitcoin Cash
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Ethereum & ERC-20 tokens
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    BSC, TRON, Polygon networks
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Enterprise Security</h3>
                <p className="text-muted-foreground mb-4">
                  Bank-grade security with encrypted storage and webhook signature verification
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    End-to-end encryption
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Webhook security
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    API key management
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Easy Integration</h3>
                <p className="text-muted-foreground mb-4">
                  RESTful APIs, webhooks, and SDKs for seamless integration with your platform
                </p>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    REST API & webhooks
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Real-time notifications
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Comprehensive docs
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-muted py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              How it works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple 3-step process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Create Account</h3>
              <p className="text-muted-foreground">
                Sign up and get instant access to virtual wallets for all supported cryptocurrencies
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Integrate API</h3>
              <p className="text-muted-foreground">
                Use our REST API to create invoices and generate unique payment addresses for customers
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Receive Payments</h3>
              <p className="text-muted-foreground">
                Get real-time webhook notifications when payments are confirmed on the blockchain
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-card py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No setup fees, no monthly fees. Pay only for successful transactions.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <Card className="border-2 border-blue-200 shadow-xl">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold text-foreground mb-2">Pay Per Transaction</h3>
                <div className="text-5xl font-bold text-blue-600 mb-4">1.5%</div>
                <p className="text-muted-foreground mb-6">per successful transaction</p>

                <ul className="space-y-3 mb-8 text-left">
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>No setup or monthly fees</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>All supported cryptocurrencies</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Real-time webhook notifications</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Merchant dashboard</span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>24/7 API support</span>
                  </li>
                </ul>

                <Link href="/register">
                  <Button size="lg" className="w-full">
                    Get Started Now
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to start accepting crypto?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses already using Cryptic Gateway to accept cryptocurrency payments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
                Create Free Account
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 text-white border-white hover:bg-white hover:text-blue-600">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bitcoin className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Cryptic Gateway</span>
            </div>
            <div className="text-slate-400">
              &copy; 2024 Cryptic Gateway. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
