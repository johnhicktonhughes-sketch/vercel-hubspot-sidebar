import { HubSpotSidebar } from "@/components/HubSpotSidebar";

const Index = () => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="w-96 flex-shrink-0">
        <HubSpotSidebar />
      </div>
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Trengo - HubSpot Integration
          </h1>
          <p className="text-muted-foreground">
            Use the sidebar to manage your HubSpot contacts and deals directly from Trengo.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
