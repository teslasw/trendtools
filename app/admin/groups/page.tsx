"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  Settings,
  ChevronRight,
} from "lucide-react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  riskLevel: string | null;
  _count: {
    userGroups: number;
    groupTools: number;
  };
}

interface Tool {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export default function GroupsManagement() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [toolsDialogOpen, setToolsDialogOpen] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    riskLevel: "LOW",
  });

  useEffect(() => {
    fetchGroups();
    fetchTools();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/admin/groups");
      if (!response.ok) throw new Error("Failed to fetch groups");
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTools = async () => {
    try {
      const response = await fetch("/api/admin/tools");
      if (!response.ok) throw new Error("Failed to fetch tools");
      const data = await response.json();
      setTools(data);
    } catch (error) {
      console.error("Failed to fetch tools:", error);
    }
  };

  const handleCreateGroup = async () => {
    try {
      const response = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create group");

      toast({
        title: "Success",
        description: "Group created successfully",
      });

      setCreateDialogOpen(false);
      setFormData({ name: "", description: "", riskLevel: "LOW" });
      fetchGroups();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/admin/groups/${selectedGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to update group");

      toast({
        title: "Success",
        description: "Group updated successfully",
      });

      setEditDialogOpen(false);
      fetchGroups();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update group",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      const response = await fetch(`/api/admin/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete group");

      toast({
        title: "Success",
        description: "Group deleted successfully",
      });

      fetchGroups();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const handleManageTools = async (group: Group) => {
    setSelectedGroup(group);

    // Fetch current tools for this group
    try {
      const response = await fetch(`/api/admin/groups/${group.id}/tools`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTools(data.map((t: any) => t.toolId));
      }
    } catch (error) {
      console.error("Failed to fetch group tools:", error);
    }

    setToolsDialogOpen(true);
  };

  const handleUpdateTools = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/admin/groups/${selectedGroup.id}/tools`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolIds: selectedTools }),
      });

      if (!response.ok) throw new Error("Failed to update tools");

      toast({
        title: "Success",
        description: "Tools updated successfully",
      });

      setToolsDialogOpen(false);
      fetchGroups();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tools",
        variant: "destructive",
      });
    }
  };

  const getRiskLevelColor = (level: string | null) => {
    switch (level) {
      case "HIGH":
        return "text-red-600 bg-red-50";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-50";
      case "LOW":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Group Management</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage user groups and their permissions
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {loading ? (
          <div className="col-span-3 text-center py-8">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-gray-500">
            No groups found. Create your first group to get started.
          </div>
        ) : (
          groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>{group.name}</CardTitle>
                  </div>
                  {group.riskLevel && (
                    <span className={`px-2 py-1 text-xs rounded-full ${getRiskLevelColor(group.riskLevel)}`}>
                      {group.riskLevel}
                    </span>
                  )}
                </div>
                <CardDescription>
                  {group.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Members</span>
                    <span className="font-medium">{group._count.userGroups}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Tools</span>
                    <span className="font-medium">{group._count.groupTools}</span>
                  </div>
                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleManageTools(group)}
                    >
                      <Settings className="mr-1 h-3 w-3" />
                      Tools
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedGroup(group);
                        setFormData({
                          name: group.name,
                          description: group.description || "",
                          riskLevel: group.riskLevel || "LOW",
                        });
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id)}
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a new user group with specific permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Group Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Premium Clients"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the group"
              />
            </div>
            <div>
              <Label>Risk Level</Label>
              <Select
                value={formData.riskLevel}
                onValueChange={(value) => setFormData({ ...formData, riskLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low Risk</SelectItem>
                  <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                  <SelectItem value="HIGH">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup}>Create Group</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update group information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Group Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Risk Level</Label>
              <Select
                value={formData.riskLevel}
                onValueChange={(value) => setFormData({ ...formData, riskLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low Risk</SelectItem>
                  <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                  <SelectItem value="HIGH">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateGroup}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tools Management Dialog */}
      <Dialog open={toolsDialogOpen} onOpenChange={setToolsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Tools for {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Select which tools this group can access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTools([...selectedTools, tool.id]);
                        } else {
                          setSelectedTools(selectedTools.filter((id) => id !== tool.id));
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <div>
                      <p className="font-medium">{tool.name}</p>
                      <p className="text-sm text-gray-500">/{tool.slug}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    tool.isActive ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-600"
                  }`}>
                    {tool.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setToolsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTools}>Save Tools</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}