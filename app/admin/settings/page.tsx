"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Activity,
  Power,
  Save,
  Database,
  Globe,
  Mail,
  Lock,
  Calculator,
  Brain,
  FileText,
} from "lucide-react";

interface Tool {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  config: any;
}

interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailNotifications: boolean;
  maxFileUploadSize: number;
  sessionTimeout: number;
  passwordMinLength: number;
  requireMFA: boolean;
}

export default function SystemSettings() {
  const { toast } = useToast();
  const [tools, setTools] = useState<Tool[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    registrationEnabled: true,
    emailNotifications: true,
    maxFileUploadSize: 10,
    sessionTimeout: 30,
    passwordMinLength: 8,
    requireMFA: false,
  });
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [toolFormData, setToolFormData] = useState({
    name: "",
    slug: "",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    fetchTools();
    fetchSettings();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await fetch("/api/admin/tools");
      if (!response.ok) throw new Error("Failed to fetch tools");
      const data = await response.json();
      setTools(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tools",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    // In a real app, this would fetch from an API
    // For now, using default values
  };

  const handleToggleTool = async (toolId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) throw new Error("Failed to update tool");

      toast({
        title: "Success",
        description: `Tool ${isActive ? "activated" : "deactivated"}`,
      });

      fetchTools();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tool",
        variant: "destructive",
      });
    }
  };

  const handleCreateTool = async () => {
    try {
      const response = await fetch("/api/admin/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toolFormData),
      });

      if (!response.ok) throw new Error("Failed to create tool");

      toast({
        title: "Success",
        description: "Tool created successfully",
      });

      setCreateDialogOpen(false);
      setToolFormData({ name: "", slug: "", description: "", isActive: true });
      fetchTools();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create tool",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTool = async () => {
    if (!selectedTool) return;

    try {
      const response = await fetch(`/api/admin/tools/${selectedTool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toolFormData),
      });

      if (!response.ok) throw new Error("Failed to update tool");

      toast({
        title: "Success",
        description: "Tool updated successfully",
      });

      setEditDialogOpen(false);
      fetchTools();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tool",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    if (!confirm("Are you sure you want to delete this tool?")) return;

    try {
      const response = await fetch(`/api/admin/tools/${toolId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete tool");

      toast({
        title: "Success",
        description: "Tool deleted successfully",
      });

      fetchTools();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete tool",
        variant: "destructive",
      });
    }
  };

  const handleSaveSettings = () => {
    toast({
      title: "Success",
      description: "System settings saved successfully",
    });
  };

  const getToolIcon = (slug: string) => {
    switch (slug) {
      case "super-calculator":
        return <Calculator className="h-4 w-4" />;
      case "spending-analyzer":
        return <Brain className="h-4 w-4" />;
      case "budget-planner":
        return <FileText className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure system-wide settings and manage tools
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Core system configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-gray-500">
                  Disable user access for maintenance
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, maintenanceMode: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>User Registration</Label>
                <p className="text-sm text-gray-500">
                  Allow new users to register
                </p>
              </div>
              <Switch
                checked={settings.registrationEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, registrationEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Email Notifications</Label>
                <p className="text-sm text-gray-500">
                  Send system emails to users
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, emailNotifications: checked })
                }
              />
            </div>

            <Button onClick={handleSaveSettings} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Save General Settings
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Security Settings</CardTitle>
            <CardDescription>
              Authentication and security configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Session Timeout (minutes)</Label>
              <Input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) =>
                  setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label>Minimum Password Length</Label>
              <Input
                type="number"
                value={settings.passwordMinLength}
                onChange={(e) =>
                  setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) })
                }
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Require MFA</Label>
                <p className="text-sm text-gray-500">
                  Enforce multi-factor authentication
                </p>
              </div>
              <Switch
                checked={settings.requireMFA}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, requireMFA: checked })
                }
              />
            </div>

            <div>
              <Label>Max File Upload Size (MB)</Label>
              <Input
                type="number"
                value={settings.maxFileUploadSize}
                onChange={(e) =>
                  setSettings({ ...settings, maxFileUploadSize: parseInt(e.target.value) })
                }
                className="mt-1"
              />
            </div>

            <Button onClick={handleSaveSettings} className="w-full">
              <Lock className="mr-2 h-4 w-4" />
              Save Security Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tools Management */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tools Management</CardTitle>
              <CardDescription>
                Configure available financial tools
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tool
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        {getToolIcon(tool.slug)}
                        <span>{tool.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {tool.slug}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {tool.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={tool.isActive}
                        onCheckedChange={(checked) => handleToggleTool(tool.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTool(tool);
                            setToolFormData({
                              name: tool.name,
                              slug: tool.slug,
                              description: tool.description || "",
                              isActive: tool.isActive,
                            });
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTool(tool.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Tool Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tool</DialogTitle>
            <DialogDescription>
              Add a new financial tool to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tool Name</Label>
              <Input
                value={toolFormData.name}
                onChange={(e) => setToolFormData({ ...toolFormData, name: e.target.value })}
                placeholder="e.g., Tax Calculator"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={toolFormData.slug}
                onChange={(e) => setToolFormData({ ...toolFormData, slug: e.target.value })}
                placeholder="e.g., tax-calculator"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={toolFormData.description}
                onChange={(e) => setToolFormData({ ...toolFormData, description: e.target.value })}
                placeholder="Brief description of the tool"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={toolFormData.isActive}
                onCheckedChange={(checked) =>
                  setToolFormData({ ...toolFormData, isActive: checked })
                }
              />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTool}>Create Tool</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Tool Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tool</DialogTitle>
            <DialogDescription>
              Update tool information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tool Name</Label>
              <Input
                value={toolFormData.name}
                onChange={(e) => setToolFormData({ ...toolFormData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={toolFormData.slug}
                onChange={(e) => setToolFormData({ ...toolFormData, slug: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={toolFormData.description}
                onChange={(e) => setToolFormData({ ...toolFormData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={toolFormData.isActive}
                onCheckedChange={(checked) =>
                  setToolFormData({ ...toolFormData, isActive: checked })
                }
              />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTool}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}