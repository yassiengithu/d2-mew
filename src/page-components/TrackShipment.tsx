import { useParams, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import ShipmentTracker from "@/components/ShipmentTracker";

const TrackShipment = () => {
  const [params] = useSearchParams();
  const { trackingNumber } = useParams();
  const initial = trackingNumber ?? params.get("tracking_number") ?? "";
  return (
    <div className="min-h-screen bg-background pb-10">
      <PageHeader title="Track Shipment" subtitle="Live updates from the courier" />
      <main className="mx-auto max-w-2xl px-4 pt-4">
        <ShipmentTracker initialTrackingNumber={initial} />
      </main>
    </div>
  );
};

export default TrackShipment;
