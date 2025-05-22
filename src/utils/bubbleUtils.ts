
import { type RealtimeChannel } from '@supabase/supabase-js';

/**
 * Gestore delle connessioni ai canali Realtime
 * Mantiene un registro dei canali attivi per evitare duplicazioni e garantire la pulizia
 */
class ConnectionManager {
  private activeChannels: { [key: string]: RealtimeChannel } = {};
  
  /**
   * Crea un nuovo canale Realtime con gestione ottimizzata
   */
  async createChannel(
    supabase: any, 
    channelName: string, 
    filters: Array<any>,
    onPayload: (payload: any) => void
  ): Promise<RealtimeChannel> {
    // Verifica se esiste già un canale con lo stesso nome
    if (this.activeChannels[channelName]) {
      console.log(`Channel ${channelName} already exists, reusing it`);
      return this.activeChannels[channelName];
    }
    
    // Crea un nuovo canale
    console.log(`Creating new channel: ${channelName}`);
    const channel = supabase.channel(channelName);
    
    // Configura gli ascoltatori per tutti i filtri forniti
    filters.forEach(filter => {
      channel.on(
        'postgres_changes',
        filter,
        (payload: any) => {
          console.log(`Received payload on channel ${channelName}:`, payload.eventType);
          onPayload(payload);
        }
      );
    });
    
    // Aggiungi callback per monitorare lo stato della connessione
    channel
      .on('system', { event: 'connected' }, () => {
        console.log(`Channel ${channelName} connected`);
      })
      .on('system', { event: 'disconnected' }, () => {
        console.log(`Channel ${channelName} disconnected`);
      })
      .on('system', { event: 'error' }, (err: any) => {
        console.error(`Channel ${channelName} error:`, err);
      });
    
    // Attiva la sottoscrizione
    try {
      await channel.subscribe((status) => {
        console.log(`Channel ${channelName} status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          this.activeChannels[channelName] = channel;
        } else if (status === 'CHANNEL_ERROR') {
          delete this.activeChannels[channelName];
        } else if (status === 'TIMED_OUT') {
          delete this.activeChannels[channelName];
          console.error(`Channel ${channelName} subscription timed out`);
        }
      });
      
      return channel;
    } catch (err) {
      console.error(`Error subscribing to channel ${channelName}:`, err);
      throw err;
    }
  }
  
  /**
   * Rimuove un canale specifico
   */
  removeChannel(supabase: any, channelName: string): void {
    const channel = this.activeChannels[channelName];
    if (channel) {
      console.log(`Removing channel: ${channelName}`);
      supabase.removeChannel(channel);
      delete this.activeChannels[channelName];
    } else {
      console.log(`Channel ${channelName} not found in active channels`);
    }
  }
  
  /**
   * Rimuove tutti i canali attivi
   */
  removeAllChannels(supabase: any): void {
    console.log(`Removing all ${Object.keys(this.activeChannels).length} active channels`);
    
    Object.entries(this.activeChannels).forEach(([channelName, channel]) => {
      supabase.removeChannel(channel);
      console.log(`Removed channel: ${channelName}`);
    });
    
    this.activeChannels = {};
  }
  
  /**
   * Registra tutti i canali attivi per debugging
   */
  logActiveChannels(): void {
    const channelCount = Object.keys(this.activeChannels).length;
    console.log(`Currently active channels (${channelCount}):`);
    
    if (channelCount > 0) {
      Object.keys(this.activeChannels).forEach(name => {
        console.log(`- ${name}`);
      });
    } else {
      console.log('No active channels');
    }
  }
}

// Esporta una singola istanza per tutta l'app
export const connectionManager = new ConnectionManager();

/**
 * Calcola se una bolla è scaduta
 */
export const isBubbleExpired = (bubble: any): boolean => {
  if (!bubble || !bubble.expires_at) return true;
  
  try {
    const expiryTime = new Date(bubble.expires_at);
    const now = new Date();
    return expiryTime < now;
  } catch (error) {
    console.error("Error checking bubble expiry:", error);
    return true;
  }
};

/**
 * Verifica se una bolla deve essere mostrata nel feed
 * Mostra le bolle non scadute e quelle scadute da meno di 24 ore
 */
export const shouldShowInFeed = (bubble: any): boolean => {
  if (!bubble || !bubble.expires_at) return false;
  
  try {
    const expiryTime = new Date(bubble.expires_at);
    const now = new Date();
    
    // Se non è scaduta, mostrala
    if (expiryTime > now) return true;
    
    // Se è scaduta, verifica se è entro 24h dalla scadenza
    const cutoffTime = new Date(expiryTime);
    cutoffTime.setHours(cutoffTime.getHours() + 24);
    
    return now < cutoffTime;
  } catch (error) {
    console.error("Error checking bubble visibility:", error);
    return false;
  }
};
