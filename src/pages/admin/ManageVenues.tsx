import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ManageVenues = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [pitches, setPitches] = useState<any[]>([]);
  const [expandedVenues, setExpandedVenues] = useState<Set<string>>(new Set());

  // Add venue dialog
  const [addVenueOpen, setAddVenueOpen] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [savingVenue, setSavingVenue] = useState(false);

  // Edit venue dialog
  const [editVenueOpen, setEditVenueOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<any>(null);
  const [editVenueName, setEditVenueName] = useState("");

  // Add pitch dialog
  const [addPitchOpen, setAddPitchOpen] = useState(false);
  const [addPitchVenueId, setAddPitchVenueId] = useState("");
  const [newPitchName, setNewPitchName] = useState("");
  const [savingPitch, setSavingPitch] = useState(false);

  // Edit pitch dialog
  const [editPitchOpen, setEditPitchOpen] = useState(false);
  const [editingPitch, setEditingPitch] = useState<any>(null);
  const [editPitchName, setEditPitchName] = useState("");

  const fetchAll = async () => {
    const [vn, pt] = await Promise.all([
      supabase.from("venues").select("*").order("name"),
      supabase.from("venue_pitches").select("*").order("name"),
    ]);
    if (vn.data) setVenues(vn.data);
    if (pt.data) setPitches(pt.data);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleExpand = (venueId: string) => {
    setExpandedVenues(prev => {
      const next = new Set(prev);
      if (next.has(venueId)) next.delete(venueId);
      else next.add(venueId);
      return next;
    });
  };

  const handleAddVenue = async () => {
    if (!newVenueName.trim()) return;
    setSavingVenue(true);
    const { error } = await supabase.from("venues").insert({ name: newVenueName.trim() });
    setSavingVenue(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Venue added");
    setAddVenueOpen(false);
    setNewVenueName("");
    fetchAll();
  };

  const handleEditVenue = async () => {
    if (!editingVenue || !editVenueName.trim()) return;
    const { error } = await supabase.from("venues").update({ name: editVenueName.trim() }).eq("id", editingVenue.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Venue updated");
    setEditVenueOpen(false);
    setEditingVenue(null);
    fetchAll();
  };

  const handleToggleVenueActive = async (venue: any) => {
    const { error } = await supabase.from("venues").update({ is_active: !venue.is_active }).eq("id", venue.id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  };

  const handleDeleteVenue = async (venue: any) => {
    const venuePitches = pitches.filter(p => p.venue_id === venue.id);
    if (venuePitches.length > 0) {
      toast.error("Remove all pitches under this venue first");
      return;
    }
    const { error } = await supabase.from("venues").delete().eq("id", venue.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Venue deleted");
    fetchAll();
  };

  const handleAddPitch = async () => {
    if (!newPitchName.trim() || !addPitchVenueId) return;
    setSavingPitch(true);
    const { error } = await supabase.from("venue_pitches").insert({ venue_id: addPitchVenueId, name: newPitchName.trim() });
    setSavingPitch(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pitch added");
    setAddPitchOpen(false);
    setNewPitchName("");
    fetchAll();
  };

  const handleEditPitch = async () => {
    if (!editingPitch || !editPitchName.trim()) return;
    const { error } = await supabase.from("venue_pitches").update({ name: editPitchName.trim() }).eq("id", editingPitch.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pitch updated");
    setEditPitchOpen(false);
    setEditingPitch(null);
    fetchAll();
  };

  const handleTogglePitchActive = async (pitch: any) => {
    const { error } = await supabase.from("venue_pitches").update({ is_active: !pitch.is_active }).eq("id", pitch.id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  };

  const handleDeletePitch = async (pitch: any) => {
    const { error } = await supabase.from("venue_pitches").delete().eq("id", pitch.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Pitch deleted");
    fetchAll();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Venues &amp; Pitches</h1>
        <Button size="sm" onClick={() => setAddVenueOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Add Venue
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Venue Name</TableHead>
                <TableHead>Pitches</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map((venue) => {
                const venuePitches = pitches.filter(p => p.venue_id === venue.id);
                const isExpanded = expandedVenues.has(venue.id);
                return (
                  <>
                    <TableRow key={venue.id}>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(venue.id)}>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{venue.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{venuePitches.length} pitch{venuePitches.length !== 1 ? "es" : ""}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch checked={venue.is_active} onCheckedChange={() => handleToggleVenueActive(venue)} />
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingVenue(venue); setEditVenueName(venue.name); setEditVenueOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteVenue(venue)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={venue.id + "-pitches"} className="bg-muted/30">
                        <TableCell colSpan={5} className="py-2 pl-10">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">Sub-venues (Pitches)</span>
                              <Button size="sm" variant="outline" onClick={() => { setAddPitchVenueId(venue.id); setAddPitchOpen(true); }}>
                                <Plus className="mr-1 h-3 w-3" /> Add Pitch
                              </Button>
                            </div>
                            {venuePitches.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic">No pitches — seniors matches use no pitch.</p>
                            ) : (
                              <div className="space-y-1">
                                {venuePitches.map(pitch => (
                                  <div key={pitch.id} className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
                                    <span className="text-sm">{pitch.name}</span>
                                    <div className="flex items-center gap-2">
                                      <Switch checked={pitch.is_active} onCheckedChange={() => handleTogglePitchActive(pitch)} />
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingPitch(pitch); setEditPitchName(pitch.name); setEditPitchOpen(true); }}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeletePitch(pitch)}>
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
              {venues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No venues yet. Click "Add Venue" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Venue Dialog */}
      <Dialog open={addVenueOpen} onOpenChange={setAddVenueOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Venue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Venue Name</Label>
              <Input value={newVenueName} onChange={(e) => setNewVenueName(e.target.value)} placeholder="e.g. Prince of Wales Park" />
            </div>
            <Button onClick={handleAddVenue} disabled={savingVenue} className="w-full">
              {savingVenue ? "Adding..." : "Add Venue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Venue Dialog */}
      <Dialog open={editVenueOpen} onOpenChange={setEditVenueOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Venue</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Venue Name</Label>
              <Input value={editVenueName} onChange={(e) => setEditVenueName(e.target.value)} />
            </div>
            <Button onClick={handleEditVenue} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Pitch Dialog */}
      <Dialog open={addPitchOpen} onOpenChange={setAddPitchOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Pitch</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Pitch Name</Label>
              <Input value={newPitchName} onChange={(e) => setNewPitchName(e.target.value)} placeholder="e.g. Full Pitch, Half Pitch North End" />
            </div>
            <Button onClick={handleAddPitch} disabled={savingPitch} className="w-full">
              {savingPitch ? "Adding..." : "Add Pitch"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Pitch Dialog */}
      <Dialog open={editPitchOpen} onOpenChange={setEditPitchOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Pitch</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Pitch Name</Label>
              <Input value={editPitchName} onChange={(e) => setEditPitchName(e.target.value)} />
            </div>
            <Button onClick={handleEditPitch} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageVenues;
