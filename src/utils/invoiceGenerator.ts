import { supabase } from '../integrations/supabase/client';

/**
 * Generates a unique invoice number based on a prefix and a date-based method.
 * @param refPrefix The prefix for the invoice number (e.g., 'INV', 'PO').
 * @param method The sequencing method ('bulan' for monthly, 'tahun' for yearly).
 * @param type The type of order ('sales' or 'purchase') to query the correct table.
 * @returns A promise that resolves to the generated invoice number.
 */
export const generateInvoiceNumber = async (refPrefix: string, method: 'bulan' | 'tahun', type: 'sales' | 'purchase'): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2); // '25' for 2025
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // '08' for August

  let datePart = '';
  let filterStartDate = '';
  let filterEndDate = '';

  if (method === 'bulan') {
    datePart = `${month}${year}`;
    filterStartDate = `${now.getFullYear()}-${month}-01T00:00:00.000Z`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    filterEndDate = `${now.getFullYear()}-${month}-${lastDay}T23:59:59.999Z`;
  } else { // method === 'tahun'
    datePart = year;
    filterStartDate = `${now.getFullYear()}-01-01T00:00:00.000Z`;
    filterEndDate = `${now.getFullYear()}-12-31T23:59:59.999Z`;
  }

  const tableName = type === 'sales' ? 'orders' : 'purchase_orders';

  // Fetch the latest invoice number for the current period from the correct table
  const { data: latestOrder } = await supabase
    .from(tableName)
    .select('invoice_number')
    .gte('created_at', filterStartDate)
    .lte('created_at', filterEndDate)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let sequence = 1;
  if (latestOrder && latestOrder.invoice_number) {
    const parts = latestOrder.invoice_number.split('-');
    const lastSequence = parseInt(parts[parts.length - 1]);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  const formattedSequence = sequence.toString().padStart(2, '0'); // '01', '02', etc.
  return `${refPrefix}${datePart}-${formattedSequence}`;
};