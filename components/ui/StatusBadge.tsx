import { Text, View } from 'react-native';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'brand';
  text: string;
  className?: string;
  dot?: boolean;
}

export function StatusBadge({
  status,
  text,
  className = '',
  dot = false,
}: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'success':
        return {
          container: 'bg-emerald-50 border-emerald-200/60',
          text: 'text-emerald-800',
          dot: 'bg-[#00D09E]',
        };
      case 'warning':
        return {
          container: 'bg-amber-50 border-amber-200/60',
          text: 'text-amber-800',
          dot: 'bg-amber-500',
        };
      case 'error':
        return {
          container: 'bg-rose-50 border-rose-200/60',
          text: 'text-rose-800',
          dot: 'bg-rose-500',
        };
      case 'brand':
        return {
          container: 'bg-brand-light border-brand-muted',
          text: 'text-brand',
          dot: 'bg-brand',
        };
      case 'info':
      default:
        return {
          container: 'bg-sky-50 border-sky-200/60',
          text: 'text-sky-800',
          dot: 'bg-sky-500',
        };
    }
  };

  const styles = getStatusStyles(status);

  return (
    <View
      className={`flex-row items-center px-2.5 py-1 rounded-full border ${styles.container} ${className}`}
    >
      {dot && (
        <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${styles.dot}`} />
      )}
      <Text className={`text-xs font-semibold tracking-wide ${styles.text}`}>
        {text}
      </Text>
    </View>
  );
}

// Helper functions for payment status badges
export function getPaymentStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return { status: 'success' as const, text: 'Completed' };
    case 'pending':
      return { status: 'warning' as const, text: 'Pending' };
    case 'failed':
      return { status: 'error' as const, text: 'Failed' };
    case 'refunded':
      return { status: 'info' as const, text: 'Refunded' };
    default:
      return { status: 'info' as const, text: 'Unknown' };
  }
}

// Helper functions for maintenance status badges. Labels mirror the server's
// `humanMaintenanceStatus` (submitted / assigned to a technician / scheduled /
// in progress / on hold / completed / cancelled).
export function getMaintenanceStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return { status: 'success' as const, text: 'Completed' };
    case 'in_progress':
      return { status: 'warning' as const, text: 'In Progress' };
    case 'scheduled':
      return { status: 'info' as const, text: 'Scheduled' };
    case 'assigned':
      return { status: 'info' as const, text: 'Assigned to a technician' };
    case 'on_hold':
      return { status: 'warning' as const, text: 'On Hold' };
    case 'submitted':
      return { status: 'info' as const, text: 'Submitted' };
    case 'cancelled':
      return { status: 'error' as const, text: 'Cancelled' };
    default:
      return { status: 'info' as const, text: 'Unknown' };
  }
}

// Priority chip styling for maintenance requests.
export function getMaintenancePriorityBadge(priority: string) {
  switch (priority) {
    case 'urgent':
      return { status: 'error' as const, text: 'Urgent' };
    case 'high':
      return { status: 'warning' as const, text: 'High' };
    case 'medium':
      return { status: 'info' as const, text: 'Medium' };
    case 'low':
      return { status: 'success' as const, text: 'Low' };
    default:
      return { status: 'info' as const, text: priority };
  }
}
