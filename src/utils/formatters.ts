import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) {
    return 'Rp 0';
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
};

export const formatDate = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return format(date, 'dd MMMM yyyy', { locale: id });
};

export const formatDateTime = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return format(date, 'dd MMMM yyyy, HH:mm', { locale: id });
};

export const formatPaymentMethod = (method: string | null | undefined): string => {
  if (!method) return 'N/A';
  return method.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};