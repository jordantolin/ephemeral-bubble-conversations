
/**
 * Connection Manager Utility
 * 
 * Gestisce le connessioni Supabase Realtime in modo centralizzato
 * per migliorare l'affidabilità e la gestione delle risorse
 */

type SupabaseClient = any;
type RealtimeChannel = any;
type ChannelFilter = any;
type PayloadHandler = (payload: any) => void;

interface ActiveChannel {
  name: string;
  channel: RealtimeChannel;
  callbacks: Array<PayloadHandler>;
}

// Lista dei canali attivi
const activeChannels: Map<string, ActiveChannel> = new Map();

/**
 * Crea un canale Realtime o riutilizza uno esistente
 */
export const createChannel = async (
  supabase: SupabaseClient,
  channelName: string,
  filters: Array<ChannelFilter>,
  callback: PayloadHandler
): Promise<void> => {
  // Verifica se il canale esiste già
  let activeChannel = activeChannels.get(channelName);
  
  if (!activeChannel) {
    console.log(`Creating new Realtime channel: ${channelName}`);
    
    // Crea il canale
    const channel = supabase.channel(channelName);
    
    activeChannel = {
      name: channelName,
      channel,
      callbacks: [callback]
    };
    
    // Configura il canale con i filtri forniti
    filters.forEach(filter => {
      channel.on(
        'postgres_changes',
        filter,
        (payload: any) => {
          // Chiama tutti i callback registrati per questo canale
          activeChannel?.callbacks.forEach(cb => cb(payload));
        }
      );
    });
    
    // Sottoscrivi il canale
    await channel.subscribe((status: string) => {
      console.log(`Channel ${channelName} status: ${status}`);
      
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully subscribed to channel: ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Error in channel: ${channelName}`);
      }
    });
    
    // Salva il canale attivo
    activeChannels.set(channelName, activeChannel);
  } else {
    console.log(`Reusing existing channel: ${channelName}`);
    
    // Aggiungi il callback alla lista dei callback esistenti
    activeChannel.callbacks.push(callback);
  }
};

/**
 * Rimuove un canale specifico
 */
export const removeChannel = (
  supabase: SupabaseClient,
  channelName: string
): void => {
  const channel = activeChannels.get(channelName);
  
  if (channel) {
    console.log(`Removing channel: ${channelName}`);
    supabase.removeChannel(channel.channel);
    activeChannels.delete(channelName);
  }
};

/**
 * Rimuove tutti i canali
 */
export const removeAllChannels = (
  supabase: SupabaseClient
): void => {
  console.log(`Removing all ${activeChannels.size} active channels`);
  
  activeChannels.forEach((channel, name) => {
    console.log(`Removing channel: ${name}`);
    supabase.removeChannel(channel.channel);
  });
  
  activeChannels.clear();
};

/**
 * Registra i canali attivi nella console
 */
export const logActiveChannels = (): void => {
  console.log(`Active channels (${activeChannels.size}):`);
  activeChannels.forEach((channel, name) => {
    console.log(`- ${name}: ${channel.callbacks.length} callbacks`);
  });
};

/**
 * Esportiamo il connection manager
 */
export const connectionManager = {
  createChannel,
  removeChannel,
  removeAllChannels,
  logActiveChannels,
  getActiveChannelCount: () => activeChannels.size
};
