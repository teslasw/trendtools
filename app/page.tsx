import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Users, Shield, Brain, FileText, ChartBar, Target, TrendingUp } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen gradient-bg">
      {/* Navigation */}
      <nav className="glass-header">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Logo width={180} height={40} />
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/signin">
              <Button variant="outline">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Financial Planning Made Simple
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Access powerful financial tools, analyze your spending, and make informed decisions
            with Trend Advisory's comprehensive customer portal.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg">Start Free Trial</Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">Learn More</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Powerful Financial Tools at Your Fingertips
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Calculator className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Superannuation Calculator</CardTitle>
                <CardDescription>
                  Plan your retirement with confidence using our advanced super calculator
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Calculate future balance projections</li>
                  <li>• Optimize contribution strategies</li>
                  <li>• Compare fee scenarios</li>
                  <li>• Generate detailed reports</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Brain className="h-12 w-12 text-primary mb-4" />
                <CardTitle>AI Spending Analyzer</CardTitle>
                <CardDescription>
                  Let AI categorize and analyze your spending patterns automatically
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Upload bank statements easily</li>
                  <li>• Automatic transaction categorization</li>
                  <li>• Spending insights and trends</li>
                  <li>• Actionable recommendations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <FileText className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Document Management</CardTitle>
                <CardDescription>
                  Securely store and manage all your financial documents in one place
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Secure cloud storage</li>
                  <li>• Easy document organization</li>
                  <li>• Quick search and retrieval</li>
                  <li>• Share with advisors securely</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <ChartBar className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Financial Reports</CardTitle>
                <CardDescription>
                  Generate comprehensive reports to track your financial progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Monthly spending summaries</li>
                  <li>• Annual financial reviews</li>
                  <li>• Custom report generation</li>
                  <li>• Export to PDF and Excel</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Goal Planning</CardTitle>
                <CardDescription>
                  Set and track financial goals with personalized recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Create custom financial goals</li>
                  <li>• Track progress in real-time</li>
                  <li>• Get personalized advice</li>
                  <li>• Milestone celebrations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Expert Support</CardTitle>
                <CardDescription>
                  Get help from our team of financial experts when you need it
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• In-app messaging</li>
                  <li>• Video consultations</li>
                  <li>• Expert financial advice</li>
                  <li>• Educational resources</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <Shield className="h-16 w-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-6">Bank-Level Security</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Your financial data is protected with enterprise-grade security, including
            256-bit encryption, multi-factor authentication, and regular security audits.
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="font-semibold mb-2">Data Encryption</h3>
              <p className="text-sm text-muted-foreground">
                All data encrypted at rest and in transit
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Compliance</h3>
              <p className="text-sm text-muted-foreground">
                GDPR and Australian Privacy Act compliant
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Regular Audits</h3>
              <p className="text-sm text-muted-foreground">
                Quarterly security audits and penetration testing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Take Control of Your Finances?
          </h2>
          <p className="text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of Australians who trust Trend Advisory with their financial planning.
          </p>
          <Link href="/auth/register">
            <Button size="lg" variant="secondary">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="h-6 w-6" />
                <span className="font-bold">Trend Advisory</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your trusted partner in financial planning.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-primary">Features</Link></li>
                <li><Link href="#" className="hover:text-primary">Pricing</Link></li>
                <li><Link href="#" className="hover:text-primary">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary">About Us</Link></li>
                <li><Link href="#" className="hover:text-primary">Contact</Link></li>
                <li><Link href="#" className="hover:text-primary">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-primary">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-primary">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2024 Trend Advisory. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}