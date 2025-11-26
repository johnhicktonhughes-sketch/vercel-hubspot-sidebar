import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateContactFormProps {
  ticketId?: string;
}

export function CreateContactForm({ ticketId }: CreateContactFormProps) {
  const { toast } = useToast();
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      jobTitle: "",
    },
  });

  useEffect(() => {
    const fetchTicketData = async () => {
      if (!ticketId) return;

      setIsLoadingTicket(true);
      try {
        console.log('Fetching ticket data for:', ticketId);
        
        const { data, error } = await supabase.functions.invoke('fetch-trengo-ticket', {
          body: { ticketId },
        });

        if (error) {
          console.error('Error fetching ticket:', error);
          toast({
            title: "Error",
            description: "Failed to load ticket data from Trengo",
            variant: "destructive",
          });
          return;
        }

        if (data) {
          console.log('Ticket data received:', data);
          form.reset({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            phone: data.phone || "",
            company: data.company || "",
            jobTitle: "",
          });
          
          toast({
            title: "Ticket Data Loaded",
            description: "Contact information pre-filled from Trengo ticket",
          });
        }
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTicket(false);
      }
    };

    fetchTicketData();
  }, [ticketId, toast]);

  const onSubmit = async (data: FormValues) => {
    try {
      console.log("Creating contact:", data);
      
      const { data: result, error } = await supabase.functions.invoke('create-hubspot-contact', {
        body: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          company: data.company,
          jobTitle: data.jobTitle,
        },
      });

      if (error) {
        console.error('Error creating contact:', error);
        toast({
          title: "Error",
          description: "Failed to create contact in HubSpot",
          variant: "destructive",
        });
        return;
      }

      if (result?.success) {
        toast({
          title: "Contact Created",
          description: `${data.firstName} ${data.lastName} has been added to HubSpot.`,
        });
        form.reset();
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isLoadingTicket && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-accent rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading ticket information...</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+1 (555) 123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="jobTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input placeholder="Sales Manager" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Contact'
          )}
        </Button>
      </form>
    </Form>
  );
}
