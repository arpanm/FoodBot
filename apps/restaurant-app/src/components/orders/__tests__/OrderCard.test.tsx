import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { OrderCard } from '../OrderCard';
import { OrderFactory } from '../../../test/factories/order.factory';

describe('OrderCard', () => {
  it('should render order number and total', () => {
    const order = OrderFactory.build({ orderNumber: '12345', total: 31.49 });
    render(<OrderCard order={order} />);

    expect(screen.getByText('#12345')).toBeInTheDocument();
    expect(screen.getByText('$31.49')).toBeInTheDocument();
  });

  it('should render customer name', () => {
    const order = OrderFactory.build({ customerName: 'John Doe' });
    render(<OrderCard order={order} />);

    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  it('should render order status badge', () => {
    const order = OrderFactory.build({ status: 'PREPARING' });
    render(<OrderCard order={order} />);

    expect(screen.getByTestId('status-badge-PREPARING')).toBeInTheDocument();
  });

  it('should show Accept Order button for PENDING orders', () => {
    const order = OrderFactory.build({ status: 'PENDING' });
    render(<OrderCard order={order} />);

    expect(screen.getByTestId('order-action-accept')).toBeInTheDocument();
    expect(screen.getByText('Accept Order')).toBeInTheDocument();
  });

  it('should show Start Preparing button for CONFIRMED orders', () => {
    const order = OrderFactory.build({ status: 'CONFIRMED' });
    render(<OrderCard order={order} />);

    expect(screen.getByTestId('order-action-preparing')).toBeInTheDocument();
  });

  it('should show Mark Ready button for PREPARING orders', () => {
    const order = OrderFactory.build({ status: 'PREPARING' });
    render(<OrderCard order={order} />);

    expect(screen.getByTestId('order-action-ready')).toBeInTheDocument();
  });

  it('should not show primary action for DELIVERED orders', () => {
    const order = OrderFactory.build({ status: 'DELIVERED' });
    render(<OrderCard order={order} />);

    expect(screen.queryByTestId('order-action-accept')).not.toBeInTheDocument();
    expect(screen.queryByTestId('order-action-preparing')).not.toBeInTheDocument();
    expect(screen.queryByTestId('order-action-ready')).not.toBeInTheDocument();
  });

  it('should call onAccept when accept button is clicked', () => {
    const onAccept = jest.fn();
    const order = OrderFactory.build({ status: 'PENDING' });
    render(<OrderCard order={order} onAccept={onAccept} />);

    fireEvent.click(screen.getByTestId('order-action-accept'));
    expect(onAccept).toHaveBeenCalledWith(order.id);
  });

  it('should call onViewDetail when details button is clicked', () => {
    const onViewDetail = jest.fn();
    const order = OrderFactory.build();
    render(<OrderCard order={order} onViewDetail={onViewDetail} />);

    fireEvent.click(screen.getByTestId('order-view-detail'));
    expect(onViewDetail).toHaveBeenCalledWith(order.id);
  });

  it('should show cancel button for PENDING and CONFIRMED orders', () => {
    const order = OrderFactory.build({ status: 'PENDING' });
    render(<OrderCard order={order} onCancel={jest.fn()} />);

    expect(screen.getByTestId('order-cancel')).toBeInTheDocument();
  });

  it('should not show cancel button for PREPARING orders', () => {
    const order = OrderFactory.build({ status: 'PREPARING' });
    render(<OrderCard order={order} onCancel={jest.fn()} />);

    expect(screen.queryByTestId('order-cancel')).not.toBeInTheDocument();
  });

  it('should display special instructions when present', () => {
    const order = OrderFactory.build({
      specialInstructions: 'Extra spicy please',
    });
    render(<OrderCard order={order} />);

    expect(screen.getByText(/Extra spicy please/)).toBeInTheDocument();
  });

  it('should display item summary', () => {
    const order = OrderFactory.build({
      items: [
        OrderFactory.buildItem({ quantity: 2, dishName: 'Burger' }),
        OrderFactory.buildItem({ quantity: 1, dishName: 'Fries' }),
      ],
    });
    render(<OrderCard order={order} />);

    expect(screen.getByText('2x Burger, 1x Fries')).toBeInTheDocument();
  });

  it('should highlight PENDING orders with yellow border', () => {
    const order = OrderFactory.build({ status: 'PENDING' });
    render(<OrderCard order={order} />);

    const card = screen.getByTestId(`order-card-${order.id}`);
    expect(card).toHaveClass('border-yellow-300');
  });
});
