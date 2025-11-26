import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  lifecycleStage: z.string().min(1, "Lifecycle stage is required"),
}).refine((data) => data.contactEmail || data.contactPhone, {
  message: "Either email or phone is required",
  path: ["contactEmail"],
});

type FormValues = z.infer<typeof formSchema>;

const lifecycleStages = [
  { value: "subscriber", label: "Subscriber" },
  { value: "lead", label: "Lead" },
  { value: "marketingqualifiedlead", label: "Marketing Qualified Lead" },
  { value: "salesqualifiedlead", label: "Sales Qualified Lead" },
  { value: "opportunity", label: "Opportunity" },
  { value: "customer", label: "Customer" },
  { value: "evangelist", label: "Evangelist" },
  { value: "other", label: "Other" },
];

interface ChangeLifecycleFormProps {
  ticketId?: string;
  onSwitchToCreate?: () => void;
}

interface HubSpotContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  lifecycleStage: string;
  leadStatus: string;
  createdDate: string;
  lastModifiedDate: string;
}

export function ChangeLifecycleForm({ ticketId, onSwitchToCreate }: ChangeLifecycleFormProps) {
  const { toast } = useToast();
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [hubspotContact, setHubspotContact] = useState<HubSpotContact | null>(null);
  const [isSearchingContact, setIsSearchingContact] = useState(false);
  const [currentLifecycleStage, setCurrentLifecycleStage] = useState<string>("");
  const [contactNotFound, setContactNotFound] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contactEmail: "",
      contactPhone: "",
      lifecycleStage: "",
    },
  });

  useEffect(() => {
    if (!ticketId) return;

    const fetchTicketData = async () => {
      setIsLoadingTicket(true);
      try {
        const { data, error } = await supabase.functions.invoke('fetch-trengo-ticket', {
          body: { ticketId },
        });

        if (error) throw error;

        // Populate email and phone from ticket data
        if (data?.email) {
          form.setValue('contactEmail', data.email);
        }
        if (data?.phone) {
          form.setValue('contactPhone', data.phone);
        }

        // Search for contact in HubSpot
        if (data?.email || data?.phone) {
          await searchHubSpotContact(data.email, data.phone);
        }

        toast({
          title: "Ticket data loaded",
          description: "Contact information has been pre-filled from the ticket.",
        });
      } catch (error) {
        console.error('Error fetching ticket data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch ticket data.",
        });
      } finally {
        setIsLoadingTicket(false);
      }
    };

    fetchTicketData();
  }, [ticketId, form, toast]);

  const searchHubSpotContact = async (email?: string, phone?: string) => {
    setIsSearchingContact(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-hubspot-contact', {
        body: { email, phone },
      });

      if (error) throw error;

      if (data?.success && data?.contact) {
        setHubspotContact(data.contact);
        setContactNotFound(false);
        setCurrentLifecycleStage(data.contact.lifecycleStage);
        // Auto-populate the lifecycle stage field
        if (data.contact.lifecycleStage) {
          form.setValue('lifecycleStage', data.contact.lifecycleStage);
        }
        toast({
          title: "Contact found",
          description: "HubSpot contact information has been loaded.",
        });
      } else {
        setContactNotFound(true);
        toast({
          variant: "default",
          title: "Contact not found",
          description: "This contact doesn't exist in HubSpot yet.",
        });
      }
    } catch (error) {
      console.error('Error searching HubSpot contact:', error);
    } finally {
      setIsSearchingContact(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    console.log("Changing lifecycle:", data);
    const selectedStage = lifecycleStages.find(s => s.value === data.lifecycleStage);
    
    try {
      form.clearErrors();
      
      const { data: result, error } = await supabase.functions.invoke('update-hubspot-lifecycle', {
        body: {
          email: data.contactEmail,
          phone: data.contactPhone,
          lifecycleStage: data.lifecycleStage,
        },
      });

      if (error) throw error;

      if (result?.success) {
        toast({
          title: "Lifecycle Updated",
          description: `Contact lifecycle changed to ${selectedStage?.label}.`,
        });
        
        // Refresh the contact data
        if (data.contactEmail || data.contactPhone) {
          await searchHubSpotContact(data.contactEmail, data.contactPhone);
        }
      } else {
        throw new Error(result?.error || 'Failed to update lifecycle');
      }
    } catch (error) {
      console.error('Error updating lifecycle:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update contact lifecycle.",
      });
    }
  };

  const selectedLifecycleStage = form.watch('lifecycleStage');
  const isStageChanged = selectedLifecycleStage !== currentLifecycleStage && selectedLifecycleStage !== "";
  const isSubmitting = form.formState.isSubmitting;

  if (isLoadingTicket || isSearchingContact) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {contactNotFound && onSwitchToCreate && (
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <p className="text-sm text-muted-foreground">
              This contact doesn't exist in HubSpot yet.
            </p>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={onSwitchToCreate}
            >
              Create New Contact
            </Button>
          </div>
        )}

        {hubspotContact && (
          <>
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <h3 className="font-semibold text-foreground">HubSpot Contact Found</h3>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  <span className="font-medium">Name:</span> {hubspotContact.firstName} {hubspotContact.lastName}
                </div>
                <div>
                  <span className="font-medium">Company:</span> {hubspotContact.company || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Current Stage:</span> {hubspotContact.lifecycleStage || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Job Title:</span> {hubspotContact.jobTitle || 'N/A'}
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="contact@example.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input 
                      type="tel" 
                      placeholder="+1234567890" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lifecycleStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Lifecycle Stage *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover z-50">
                      {lifecycleStages.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={!isStageChanged || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Lifecycle"
              )}
            </Button>
          </>
        )}
      </form>
    </Form>
  );
}
