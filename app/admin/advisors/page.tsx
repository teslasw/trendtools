"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  UserPlus,
  Edit,
  Trash2,
  Upload,
  Star,
  Users,
  Phone,
  Mail,
  Award,
  Calendar,
  CheckCircle,
  XCircle,
  Image,
  Briefcase,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";

interface Advisor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  credentials?: string | null;
  bio?: string | null;
  specialties?: string[];
  yearsExperience?: number | null;
  profileImageUrl?: string | null;
  calendlyUrl?: string | null;
  availableHours?: any;
  rating?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    clients: number;
  };
}

export default function AdvisorsManagement() {
  const { toast } = useToast();
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    title: "",
    credentials: "",
    bio: "",
    specialties: [] as string[],
    yearsExperience: "",
    calendlyUrl: "",
    rating: "4.9",
    isActive: true,
  });

  useEffect(() => {
    fetchAdvisors();
  }, []);

  const fetchAdvisors = async () => {
    try {
      const response = await fetch("/api/admin/advisors");
      if (!response.ok) throw new Error("Failed to fetch advisors");
      const data = await response.json();
      setAdvisors(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load advisors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdvisor = () => {
    setIsCreating(true);
    setSelectedAdvisor(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      title: "",
      credentials: "",
      bio: "",
      specialties: [],
      yearsExperience: "",
      calendlyUrl: "",
      rating: "4.9",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleEditAdvisor = (advisor: Advisor) => {
    setIsCreating(false);
    setSelectedAdvisor(advisor);
    setFormData({
      firstName: advisor.firstName,
      lastName: advisor.lastName,
      email: advisor.email,
      phone: advisor.phone || "",
      title: advisor.title || "",
      credentials: advisor.credentials || "",
      bio: advisor.bio || "",
      specialties: advisor.specialties || [],
      yearsExperience: advisor.yearsExperience?.toString() || "",
      calendlyUrl: advisor.calendlyUrl || "",
      rating: advisor.rating?.toString() || "4.9",
      isActive: advisor.isActive,
    });
    setDialogOpen(true);
  };

  const handleSaveAdvisor = async () => {
    try {
      const url = isCreating
        ? "/api/admin/advisors"
        : `/api/admin/advisors/${selectedAdvisor?.id}`;
      
      const method = isCreating ? "POST" : "PATCH";
      
      const payload = {
        ...formData,
        yearsExperience: formData.yearsExperience ? parseInt(formData.yearsExperience) : null,
        rating: formData.rating ? parseFloat(formData.rating) : null,
        specialties: formData.specialties.length > 0 ? formData.specialties : [],
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save advisor");
      }

      toast({
        title: "Success",
        description: `Advisor ${isCreating ? "created" : "updated"} successfully`,
      });

      setDialogOpen(false);
      fetchAdvisors();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save advisor",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdvisor = async (advisorId: string) => {
    if (!confirm("Are you sure you want to delete this advisor?")) return;

    try {
      const response = await fetch(`/api/admin/advisors/${advisorId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete advisor");
      }

      toast({
        title: "Success",
        description: "Advisor deleted successfully",
      });

      fetchAdvisors();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete advisor",
        variant: "destructive",
      });
    }
  };

  const handlePhotoUpload = async (advisorId: string, file: File) => {
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/admin/advisors/${advisorId}/upload-photo`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload photo");
      }

      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });

      fetchAdvisors();
      setUploadDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload photo",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const filteredAdvisors = advisors.filter((advisor) => {
    const matchesSearch =
      advisor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${advisor.firstName} ${advisor.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      advisor.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Advisor Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage financial advisors and their client assignments
          </p>
        </div>
        <Button onClick={handleCreateAdvisor}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Advisor
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Advisors</p>
                <p className="text-2xl font-bold">{advisors.length}</p>
              </div>
              <Briefcase className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {advisors.filter(a => a.isActive).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">
                  {advisors.reduce((sum, a) => sum + (a._count?.clients || 0), 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold flex items-center">
                  {(advisors.reduce((sum, a) => sum + (a.rating || 0), 0) / advisors.length).toFixed(1)}
                  <Star className="h-4 w-4 text-yellow-500 ml-1" />
                </p>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              placeholder="Search advisors by name, email, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" onClick={fetchAdvisors}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advisors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Advisors ({filteredAdvisors.length})</CardTitle>
          <CardDescription>
            Manage advisor profiles and client assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Advisor</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Credentials</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdvisors.map((advisor) => (
                    <TableRow key={advisor.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={advisor.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {getInitials(advisor.firstName, advisor.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {advisor.firstName} {advisor.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {advisor.title || "Financial Advisor"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                            {advisor.email}
                          </div>
                          {advisor.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                              {advisor.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {advisor.credentials ? (
                          <Badge variant="secondary">{advisor.credentials}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {advisor.yearsExperience ? (
                          <span>{advisor.yearsExperience} years</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {advisor._count?.clients || 0} clients
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {advisor.rating && (
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            <span>{advisor.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {advisor.isActive ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAdvisor(advisor);
                              setUploadDialogOpen(true);
                            }}
                          >
                            <Image className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditAdvisor(advisor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAdvisor(advisor.id)}
                            disabled={advisor._count?.clients && advisor._count.clients > 0}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAdvisors.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No advisors found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? "Add New Advisor" : "Edit Advisor"}
            </DialogTitle>
            <DialogDescription>
              {isCreating 
                ? "Create a new financial advisor profile" 
                : "Update advisor information and settings"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Senior Financial Advisor"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="credentials">Credentials</Label>
                <Input
                  id="credentials"
                  value={formData.credentials}
                  onChange={(e) => setFormData({...formData, credentials: e.target.value})}
                  placeholder="CFA, CFP"
                />
              </div>
              <div>
                <Label htmlFor="yearsExperience">Years of Experience</Label>
                <Input
                  id="yearsExperience"
                  type="number"
                  value={formData.yearsExperience}
                  onChange={(e) => setFormData({...formData, yearsExperience: e.target.value})}
                  min="0"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Brief professional biography..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="specialties">Specialties (comma-separated)</Label>
              <Input
                id="specialties"
                value={formData.specialties.join(", ")}
                onChange={(e) => setFormData({
                  ...formData, 
                  specialties: e.target.value.split(",").map(s => s.trim()).filter(s => s)
                })}
                placeholder="Retirement Planning, Investment Strategy, Tax Optimization"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="calendlyUrl">Calendly URL</Label>
                <Input
                  id="calendlyUrl"
                  value={formData.calendlyUrl}
                  onChange={(e) => setFormData({...formData, calendlyUrl: e.target.value})}
                  placeholder="https://calendly.com/advisor-name"
                />
              </div>
              <div>
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  type="number"
                  value={formData.rating}
                  onChange={(e) => setFormData({...formData, rating: e.target.value})}
                  min="0"
                  max="5"
                  step="0.1"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Active (can receive new clients)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAdvisor}>
              {isCreating ? "Create Advisor" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Profile Photo</DialogTitle>
            <DialogDescription>
              Upload a profile photo for {selectedAdvisor?.firstName} {selectedAdvisor?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedAdvisor?.profileImageUrl && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">Current Photo:</p>
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedAdvisor.profileImageUrl} />
                  <AvatarFallback>
                    {getInitials(selectedAdvisor.firstName, selectedAdvisor.lastName)}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            <div>
              <Label htmlFor="photo">Select New Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && selectedAdvisor) {
                    handlePhotoUpload(selectedAdvisor.id, file);
                  }
                }}
                disabled={uploadingPhoto}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supported formats: JPEG, PNG, WebP (max 5MB)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={uploadingPhoto}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}