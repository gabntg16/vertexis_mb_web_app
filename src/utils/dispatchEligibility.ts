import { paymentReady } from '../../functions/src/transactionModel';
import type { Delivery, Order } from '../types';

export function isOrderReadyForDispatch(order: Order, deliveries: Delivery[]): boolean {
  return paymentReady(order) && !order.isArchived && !order.isDispatched &&
    ['ready_for_dispatch', 'ready'].includes(order.productionStage ?? '') &&
    !deliveries.some(delivery => delivery.orderId === order.id && delivery.status !== 'canceled');
}
