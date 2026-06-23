import { Text, View } from 'react-native';

interface StatusBadgeProps {
  status: 'success' | 'warning' | 'error' | 'info';
  text: string;
  className?: string;
}

export function StatusBadge({ status, text, className = '' }: StatusBadgeProps) {
  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <View className={`px-2 py-1 rounded-full border ${getStatusClasses(status)} ${className}`}>
      <Text className="text-xs font-medium">{text}</Text>
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