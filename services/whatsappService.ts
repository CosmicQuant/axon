import type { DeliveryOrder } from '../types';

const AXON_WHATSAPP_NUMBER = '254725720837';

export function buildWhatsAppMessage(order: Partial<DeliveryOrder> & { serviceType?: string }): string {
    const lines: string[] = ['🟢 NEW AXON BOOKING'];

    lines.push(`From: ${order.pickup || '—'}`);
    lines.push(`To: ${order.dropoff || '—'}`);

    const waypoints = (order.stops || []).filter(s => s.type === 'waypoint');
    if (waypoints.length > 0) {
        lines.push(`Stops: ${waypoints.length} (${waypoints.map(s => s.address).join(', ')})`);
    }

    const itemDesc = order.items?.itemDesc || '—';
    const weight = order.items?.weightKg ? `${order.items.weightKg}kg` : '';
    lines.push(`Item: ${itemDesc}${weight ? ` (${weight})` : ''}`);

    const vehicleLabel = order.vehicle || ((order.serviceType as string) === 'Standard' ? 'Consolidated' : '—');
    lines.push(`Vehicle: ${vehicleLabel} | Service: ${order.serviceType || '—'}`);

    const scheduled = order.pickupTime && order.pickupTime !== 'ASAP'
        ? new Date(order.pickupTime).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
        : 'ASAP';
    lines.push(`Scheduled: ${scheduled}`);

    lines.push(`Price: KES ${(order.price || 0).toLocaleString()}`);

    const recipient = order.recipient;
    if (recipient) {
        lines.push(`Recipient: ${recipient.name || '—'}${recipient.phone ? ` • ${recipient.phone}` : ''}`);
    }

    lines.push(`Payment: ${order.paymentMethod || '—'}`);

    if (order.verificationCode) {
        lines.push(`Code: ${order.verificationCode}`);
    }

    const sender = order.sender;
    if (sender && (sender.name || sender.phone)) {
        lines.push(`Sender: ${sender.name || '—'}${sender.phone ? ` • ${sender.phone}` : ''}`);
    }

    return lines.join('\n');
}

export function openWhatsApp(order: Partial<DeliveryOrder>): void {
    const message = buildWhatsAppMessage(order);
    const url = `https://wa.me/${AXON_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

export function openWhatsAppBlank(): void {
    const url = `https://wa.me/${AXON_WHATSAPP_NUMBER}`;
    if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}
