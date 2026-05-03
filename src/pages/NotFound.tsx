import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      icon={<Compass size={20} />}
      title="Page not found"
      description="That route isn't part of the Hotel Optimizer app."
      action={
        <Link to="/" className="btn-primary">
          Back to dashboard
        </Link>
      }
    />
  );
}
