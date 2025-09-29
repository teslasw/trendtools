"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ClientOnlyBadge } from "@/components/ui/client-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Phone,
  Video,
  Calendar,
  Clock,
  Mail,
  User,
  Send,
  CheckCircle,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvisorContactProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: string; // Which tool/page they're coming from
}

export function AdvisorContactDialog({ open, onOpenChange, context }: AdvisorContactProps) {
  const { data: session } = useSession();
  const [contactMethod, setContactMethod] = useState("message");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Check if user is a client
  const userGroups = (session?.user as any)?.groups || [];
  const isClient = !userGroups.includes("Free Users") && userGroups.length > 0;
  const advisorId = (session?.user as any)?.advisorId;
  const userName = session?.user?.name || "Client";

  const handleSubmit = async () => {
    if (!isClient) return;

    setIsSubmitting(true);
    
    // TODO: Implement actual submission to backend
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      onOpenChange(false);
      setMessage("");
      setSubject("");
      setPreferredTime("");
    }, 3000);
  };

  if (!isClient) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              Speak to Financial Advisor
              <ClientOnlyBadge />
            </DialogTitle>
            <DialogDescription>
              This feature is available exclusively for advisory clients
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upgrade to Advisory Client</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Get personalized financial advice from our expert advisors with direct access via chat, phone, or video calls.
            </p>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Learn More About Advisory Services
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (isSubmitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Request Sent Successfully!</h3>
            <p className="text-muted-foreground">
              Your advisor will contact you within 24 hours.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Contact Your Financial Advisor</DialogTitle>
          <DialogDescription>
            {advisorId ? `Your advisor will respond within 24 hours` : `Choose how you'd like to connect with an advisor`}
          </DialogDescription>
        </DialogHeader>

        {advisorId && (
          <Alert className="mt-4">
            <User className="h-4 w-4" />
            <AlertDescription>
              <strong>Your Advisor:</strong> {advisorId === "advisor-001" ? "Sarah Johnson, CFA" : advisorId === "advisor-002" ? "Michael Chen, CFP" : "Your assigned advisor"}
              <br />
              <span className="text-xs text-muted-foreground">Senior Financial Advisor • 10+ years experience</span>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={contactMethod} onValueChange={setContactMethod} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="message" className="text-xs">
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
            </TabsTrigger>
            <TabsTrigger value="phone" className="text-xs">
              <Phone className="h-4 w-4 mr-1" />
              Call
            </TabsTrigger>
            <TabsTrigger value="video" className="text-xs">
              <Video className="h-4 w-4 mr-1" />
              Video
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs">
              <Calendar className="h-4 w-4 mr-1" />
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="message" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="What would you like to discuss?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Describe your question or concern in detail..."
                className="min-h-[120px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {context && (
              <Alert>
                <AlertDescription className="text-xs">
                  Context: Requesting from {context}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="phone" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="phone-topic">What would you like to discuss?</Label>
              <Input
                id="phone-topic"
                placeholder="Brief topic for the call"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Preferred time for call</Label>
              <RadioGroup value={preferredTime} onValueChange={setPreferredTime}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="morning" id="morning" />
                  <Label htmlFor="morning">Morning (9 AM - 12 PM)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="afternoon" id="afternoon" />
                  <Label htmlFor="afternoon">Afternoon (12 PM - 5 PM)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="evening" id="evening" />
                  <Label htmlFor="evening">Evening (5 PM - 7 PM)</Label>
                </div>
              </RadioGroup>
            </div>
            <Alert>
              <Phone className="h-4 w-4" />
              <AlertDescription>
                Your advisor will call you at your registered phone number within the selected time frame.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="video" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="video-topic">Meeting agenda</Label>
              <Input
                id="video-topic"
                placeholder="What would you like to discuss?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="video-notes">Additional notes (optional)</Label>
              <Textarea
                id="video-notes"
                placeholder="Any specific documents or topics to prepare?"
                className="min-h-[80px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Alert>
              <Video className="h-4 w-4" />
              <AlertDescription>
                You'll receive a video meeting link via email once your advisor confirms availability.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Quick Consultation</CardTitle>
                  <CardDescription className="text-xs">15-minute phone call</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Next available: Tomorrow, 2:00 PM
                  </div>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Portfolio Review</CardTitle>
                  <CardDescription className="text-xs">45-minute video call</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Next available: Thursday, 10:00 AM
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Financial Planning Session</CardTitle>
                  <CardDescription className="text-xs">90-minute comprehensive review</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Next available: Next Monday, 3:00 PM
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (contactMethod === "message" && (!subject || !message))}
          >
            {isSubmitting ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AdvisorContactButtonProps {
  context?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function AdvisorContactButton({ 
  context, 
  variant = "outline", 
  size = "default",
  className 
}: AdvisorContactButtonProps) {
  const { data: session } = useSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const userGroups = (session?.user as any)?.groups || [];
  const isClient = !userGroups.includes("Free Users") && userGroups.length > 0;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className={cn(className)}
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        Speak to Advisor
        {!isClient && <ClientOnlyBadge />}
      </Button>
      
      <AdvisorContactDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        context={context}
      />
    </>
  );
}