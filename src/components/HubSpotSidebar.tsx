import { useState, useEffect } from "react";
import { Building2, UserCircle, DollarSign } from "lucide-react";
import hubspotLogo from "@/assets/hubspot-logo.png";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateContactForm } from "./forms/CreateContactForm";
import { ChangeLifecycleForm } from "./forms/ChangeLifecycleForm";
import { CreateDealForm } from "./forms/CreateDealForm";

type ActionType = "create-contact" | "change-lifecycle" | "create-deal" | null;

export function HubSpotSidebar() {
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);
  const [currentTicketId, setCurrentTicketId] = useState<string>("");
  
  useEffect(() => {
    // Try multiple methods to get ticket ID
    let ticketId = "";
    
    // Method 1: Check URL parameters (if Trengo passes ticketId as param)
    const urlParams = new URLSearchParams(window.location.search);
    const urlTicketId = urlParams.get('ticketId') || urlParams.get('ticket_id');
    
    if (urlTicketId) {
      ticketId = urlTicketId;
      console.log('Got ticket ID from URL parameter:', ticketId);
    } else {
      // Method 2: Try to get from parent window URL
      try {
        const parentUrl = window.parent.location.href;
        const match = parentUrl.match(/\/tickets\/(\d+)/);
        if (match && match[1]) {
          ticketId = match[1];
          console.log('Got ticket ID from parent URL:', ticketId);
        }
      } catch (e) {
        // Method 3: Try to get from current window pathname
        const pathMatch = window.location.pathname.match(/\/tickets\/(\d+)/);
        if (pathMatch && pathMatch[1]) {
          ticketId = pathMatch[1];
          console.log('Got ticket ID from current pathname:', ticketId);
        } else {
          // Fallback to demo ticket for preview
          ticketId = "903563479";
          console.log('Using demo ticket ID for preview');
        }
      }
    }
    
    setCurrentTicketId(ticketId);
  }, []);

  const renderForm = () => {
    switch (selectedAction) {
      case "create-contact":
        return <CreateContactForm ticketId={currentTicketId} />;
      case "change-lifecycle":
        return <ChangeLifecycleForm ticketId={currentTicketId} onSwitchToCreate={() => setSelectedAction("create-contact")} />;
      case "create-deal":
        return <CreateDealForm ticketId={currentTicketId} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Select an action to get started
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-1">
          <img src={hubspotLogo} alt="HubSpot" className="h-8 w-8" />
          <h2 className="text-lg font-semibold text-sidebar-foreground">
            HubSpot Integration
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Manage contacts and deals
        </p>
      </div>

      <div className="p-6">
        <Select
          value={selectedAction || ""}
          onValueChange={(value) => setSelectedAction(value as ActionType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an action..." />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            <SelectItem value="create-contact">
              <div className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                <span>Create Contact</span>
              </div>
            </SelectItem>
            <SelectItem value="change-lifecycle">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Change Contact Lifecycle</span>
              </div>
            </SelectItem>
            <SelectItem value="create-deal">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>Create New Deal</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {renderForm()}
      </div>
    </div>
  );
}
