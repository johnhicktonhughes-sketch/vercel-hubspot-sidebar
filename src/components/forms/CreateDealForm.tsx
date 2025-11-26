import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, TriangleAlert } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createHubSpotDeal, fetchTrengoTicket, getDealPipelines, DealStage, Pipeline } from "@/lib/apiClient";

const formSchema = z.object({
  dealName: z.string().min(1, "Deal name is required").max(100),
  amount: z.string().min(1, "Amount is required"),
  pipeline: z.string().min(1, "Pipeline is required"),
  stage: z.string().min(1, "Deal stage is required"),
  contactEmail: z.string().email("Invalid email address"),
  closeDate: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateDealFormProps {
  ticketId?: string;
}

export function CreateDealForm({ ticketId }: CreateDealFormProps) {
  const { toast } = useToast();
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  const [isLoadingStages, setIsLoadingStages] = useState(false);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [dealStages, setDealStages] = useState<DealStage[]>([]);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<{ email: string; company: string } | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dealName: "",
      amount: "",
      pipeline: "",
      stage: "",
      contactEmail: "",
      closeDate: "",
      description: "",
    },
  });

  useEffect(() => {
      const fetchDealStages = async () => {
        setIsLoadingStages(true);
        try {
          const data = await getDealPipelines();
          setPipelineError(null);

          if (data?.success && data?.pipelines) {
            setPipelines(data.pipelines);
            if (data.pipelines.length > 0) {
              const defaultPipeline = data.pipelines[0];
              setSelectedPipeline(defaultPipeline.id);
              setDealStages(defaultPipeline.stages);
              form.setValue('pipeline', defaultPipeline.id);
            }
          } else {
            throw new Error('No pipelines returned from API');
          }
        } catch (error) {
          console.error('Error fetching deal stages:', error);
          setPipelineError(
            "We couldn't load your HubSpot deal pipelines. Check your HubSpot Deals API key in Vercel or try again."
          );
          const fallbackPipeline = {
            id: 'default',
            label: 'Sales Pipeline',
            stages: [
              { id: 'appointmentscheduled', label: 'Appointment Scheduled', displayOrder: 0 },
              { id: 'qualifiedtobuy', label: 'Qualified to Buy', displayOrder: 1 },
              { id: 'presentationscheduled', label: 'Presentation Scheduled', displayOrder: 2 },
              { id: 'decisionmakerboughtin', label: 'Decision Maker Bought-In', displayOrder: 3 },
              { id: 'contractsent', label: 'Contract Sent', displayOrder: 4 },
              { id: 'closedwon', label: 'Closed Won', displayOrder: 5 },
              { id: 'closedlost', label: 'Closed Lost', displayOrder: 6 },
            ]
          };
          setPipelines([fallbackPipeline]);
          setSelectedPipeline(fallbackPipeline.id);
          setDealStages(fallbackPipeline.stages);
          form.setValue('pipeline', fallbackPipeline.id);
        } finally {
          setIsLoadingStages(false);
        }
      };

    fetchDealStages();
  }, [toast, form]);

  useEffect(() => {
    if (!ticketId) return;

      const fetchTicketData = async () => {
        setIsLoadingTicket(true);
        try {
          const data = await fetchTrengoTicket(ticketId);

          setContactInfo({
            email: data.email || '',
            company: data.company || '',
          });

          if (data.email) {
            form.setValue('contactEmail', data.email);
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

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (pipeline) {
      setDealStages(pipeline.stages);
      // Reset stage selection when pipeline changes
      form.setValue('stage', '');
    }
  };

  const onSubmit = async (data: FormValues) => {
    console.log("Creating deal:", data);
    
    try {
      const result = await createHubSpotDeal({
        dealName: data.dealName,
        amount: data.amount,
        pipeline: data.pipeline,
        stage: data.stage,
        contactEmail: data.contactEmail,
        closeDate: data.closeDate,
        description: data.description,
      });

      if (result?.success) {
        toast({
          title: "Deal Created",
          description: `${data.dealName} has been added to your pipeline.`,
        });
        form.reset();
      } else {
        throw new Error(result?.error || 'Failed to create deal');
      }
    } catch (error) {
      console.error('Error creating deal:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create deal in HubSpot.",
      });
    }
  };

  if (isLoadingTicket || isLoadingStages) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {pipelineError && (
          <Alert variant="destructive">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>Pipeline unavailable</AlertTitle>
            <AlertDescription className="text-sm">
              {pipelineError}
            </AlertDescription>
          </Alert>
        )}

        {contactInfo && (
          <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
            <h3 className="font-semibold text-foreground">Contact Information</h3>
            <div className="space-y-1 text-muted-foreground">
              {contactInfo.email && (
                <div>
                  <span className="font-medium">Email:</span> {contactInfo.email}
                </div>
              )}
              {contactInfo.company && (
                <div>
                  <span className="font-medium">Company:</span> {contactInfo.company}
                </div>
              )}
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="dealName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deal Name *</FormLabel>
              <FormControl>
                <Input placeholder="Q4 Enterprise License" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount *</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="50000" 
                  {...field} 
                />
              </FormControl>
              <FormDescription className="text-xs">
                Deal value in USD
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pipeline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deal Pipeline *</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  handlePipelineChange(value);
                }} 
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pipeline..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover z-50">
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deal Stage *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={!selectedPipeline || dealStages.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover z-50">
                  {dealStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Associated Contact *</FormLabel>
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
          name="closeDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expected Close Date</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add deal notes..." 
                  className="resize-none"
                  rows={3}
                  {...field} 
                />
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
            "Create Deal"
          )}
        </Button>
      </form>
    </Form>
  );
}
