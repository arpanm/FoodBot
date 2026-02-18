import React from 'react';

import type { Order } from '../../types/models';
import { Card } from '../common/Card';
import type { Stage } from '../Status/ProgressStepper';
import { ProgressStepper } from '../Status/ProgressStepper';

/** Extended tracking info as used by the tracking component */
interface TrackingDisplayInfo {
  currentStage: string;
  stages: Stage[];
  estimatedArrival?: string;
  driverInfo?: {
    name: string;
    phone: string;
    vehicleNumber: string;
  };
}

export interface OrderTrackingProps {
  order: (Order & { trackingInfo?: TrackingDisplayInfo }) | null;
  onRefresh?: () => void;
  'data-testid'?: string;
}

/**
 * Real-time order tracking component
 */
export const OrderTracking: React.FC<OrderTrackingProps> = ({
  order,
  onRefresh,
  'data-testid': testId,
}) => {
  if (!order?.trackingInfo) {
    return (
      <div data-testid="tracking-unavailable">
        Tracking information is not available
      </div>
    );
  }

  const { trackingInfo } = order;

  return (
    <div className="order-tracking" data-testid={testId || 'order-tracking'}>
      <Card variant="elevated">
        <div className="tracking-header">
          <h3 data-testid="tracking-title">Order Tracking</h3>
          <span data-testid="tracking-status">
            {trackingInfo.currentStage.replace(/_/g, ' ')}
          </span>
        </div>

        <ProgressStepper
          stages={trackingInfo.stages}
          currentStage={trackingInfo.currentStage}
        />

        {trackingInfo.estimatedArrival && (
          <div className="estimated-arrival" data-testid="estimated-arrival">
            Estimated arrival: {new Date(trackingInfo.estimatedArrival).toLocaleTimeString()}
          </div>
        )}

        {trackingInfo.driverInfo && (
          <div className="driver-info" data-testid="driver-info">
            <h4>Driver</h4>
            <div data-testid="driver-name">{trackingInfo.driverInfo.name}</div>
            <div data-testid="driver-phone">{trackingInfo.driverInfo.phone}</div>
            <div data-testid="driver-vehicle">{trackingInfo.driverInfo.vehicleNumber}</div>
          </div>
        )}

        {onRefresh && (
          <button onClick={onRefresh} data-testid="refresh-tracking">
            Refresh
          </button>
        )}
      </Card>
    </div>
  );
};
