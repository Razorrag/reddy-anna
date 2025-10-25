// WhatsApp Integration Service
import { supabaseServer } from "./lib/supabaseServer";

export interface WhatsAppRequest {
  userId: string;
  userPhone: string;
  requestType: 'withdrawal' | 'deposit' | 'support' | 'balance';
  message: string;
  amount?: number;
  isUrgent?: boolean;
  metadata?: any;
}

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  whatsappUrl?: string;
  error?: string;
  message?: string;
}

// Get admin WhatsApp number from settings (default fallback)
const getAdminWhatsAppNumber = async (): Promise<string> => {
  try {
    const { data, error } = await supabaseServer
      .from('game_settings')
      .select('setting_value')
      .eq('setting_key', 'admin_whatsapp_number')
      .single();

    if (error || !data) {
      console.log('Using default admin WhatsApp number');
      return '918686886632'; // Default from existing button
    }

    return data.setting_value;
  } catch (error) {
    console.error('Error fetching admin WhatsApp number:', error);
    return '918686886632'; // Default fallback
  }
};

// Format message based on request type
const formatWhatsAppMessage = (request: WhatsAppRequest): string => {
  const { requestType, userPhone, message, amount } = request;

  switch (requestType) {
    case 'withdrawal':
      return `🔴 *Withdrawal Request*\n\nUser: ${userPhone}\nAmount: ₹${amount?.toLocaleString('en-IN')}\n\nMessage: ${message}`;
    
    case 'deposit':
      return `🟢 *Deposit Request*\n\nUser: ${userPhone}\nAmount: ₹${amount?.toLocaleString('en-IN')}\n\nMessage: ${message}`;
    
    case 'support':
      return `💬 *Support Request*\n\nUser: ${userPhone}\n\nMessage: ${message}`;
    
    case 'balance':
      return `💰 *Balance Inquiry*\n\nUser: ${userPhone}\n\nMessage: ${message}`;
    
    default:
      return `📩 *User Request*\n\nUser: ${userPhone}\n\nMessage: ${message}`;
  }
};

// Send WhatsApp request - Opens WhatsApp with pre-filled message
export const sendWhatsAppRequest = async (request: WhatsAppRequest): Promise<WhatsAppResponse> => {
  try {
    // Get admin WhatsApp number
    const adminPhone = await getAdminWhatsAppNumber();

    // Format the message
    const formattedMessage = formatWhatsAppMessage(request);

    // Save to database for tracking (optional - for admin records)
    try {
      await supabaseServer
        .from('whatsapp_messages')
        .insert({
          user_id: request.userId,
          user_phone: request.userPhone,
          admin_phone: adminPhone,
          request_type: request.requestType,
          message: request.message,
          status: 'pending',
          priority: request.isUrgent ? 1 : 3,
          is_urgent: request.isUrgent || false,
          metadata: request.metadata ? JSON.stringify(request.metadata) : null,
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      console.error('Error saving to database (non-critical):', dbError);
      // Continue - database tracking is optional
    }

    // Generate WhatsApp URL that opens user's WhatsApp
    const encodedMessage = encodeURIComponent(formattedMessage);
    const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodedMessage}`;

    return {
      success: true,
      whatsappUrl,
      message: 'Opening WhatsApp...'
    };
  } catch (error) {
    console.error('Send WhatsApp request error:', error);
    return {
      success: false,
      error: 'Failed to generate WhatsApp link'
    };
  }
};

// Get user's request history
export const getUserRequestHistory = async (userId: string, limit: number = 20): Promise<any> => {
  try {
    const { data, error } = await supabaseServer
      .from('whatsapp_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching request history:', error);
      return { success: false, error: 'Failed to fetch request history' };
    }

    return {
      success: true,
      requests: data || []
    };
  } catch (error) {
    console.error('Get request history error:', error);
    return {
      success: false,
      error: 'Failed to fetch request history'
    };
  }
};

// Get pending admin requests
export const getPendingAdminRequests = async (): Promise<any> => {
  try {
    const { data, error } = await supabaseServer
      .from('whatsapp_messages')
      .select('*')
      .eq('status', 'pending')
      .order('is_urgent', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending requests:', error);
      return { success: false, error: 'Failed to fetch pending requests' };
    }

    return {
      success: true,
      requests: data || []
    };
  } catch (error) {
    console.error('Get pending requests error:', error);
    return {
      success: false,
      error: 'Failed to fetch pending requests'
    };
  }
};

// Update request status
export const updateRequestStatus = async (
  requestId: string,
  status: 'pending' | 'sent' | 'responded',
  responseMessage?: string,
  responseBy?: string
): Promise<any> => {
  try {
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'responded') {
      updates.responded_at = new Date().toISOString();
      updates.response_message = responseMessage;
      updates.response_by = responseBy;
    }

    const { data, error } = await supabaseServer
      .from('whatsapp_messages')
      .update(updates)
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error updating request status:', error);
      return { success: false, error: 'Failed to update request status' };
    }

    return {
      success: true,
      request: data
    };
  } catch (error) {
    console.error('Update request status error:', error);
    return {
      success: false,
      error: 'Failed to update request status'
    };
  }
};
