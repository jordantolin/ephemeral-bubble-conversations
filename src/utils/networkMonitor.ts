
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

let isMonitoring = false;
let pingInterval: number | null = null;
let reconnectTimeout: number | null = null;
let consecutiveFailures = 0;

// Configura il monitor di rete per rilevare problemi di connessione
export const setupNetworkMonitor = () => {
  if (isMonitoring) return;
  
  console.log("Setting up network connection monitor");
  isMonitoring = true;
  
  // Monitoraggio eventi online/offline
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Monitoraggio ping periodico (ogni 30 secondi)
  startPingMonitoring();
  
  // Stato iniziale
  if (!navigator.onLine) {
    handleOffline();
  }
};

export const teardownNetworkMonitor = () => {
  if (!isMonitoring) return;
  
  console.log("Tearing down network connection monitor");
  isMonitoring = false;
  
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
};

const handleOnline = () => {
  console.log("🌐 App is back online");
  toast({
    title: "Connessione ripristinata",
    description: "L'applicazione è di nuovo connessa",
    variant: "default"
  });
  
  // Reset del conteggio errori
  consecutiveFailures = 0;
  
  // Riprova la connessione Supabase
  reconnectSupabase();
};

const handleOffline = () => {
  console.log("🔌 App is offline");
  toast({
    title: "Connessione persa",
    description: "Verifica la tua connessione internet",
    variant: "destructive"
  });
};

const startPingMonitoring = () => {
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  
  // Esegui ping ogni 30 secondi
  pingInterval = window.setInterval(async () => {
    try {
      const startTime = performance.now();
      const { data, error } = await supabase.rpc('ping', {}, {
        count: 'exact',
        head: true
      });
      const endTime = performance.now();
      
      if (error) {
        console.error("Ping to Supabase failed:", error);
        handlePingFailure();
        return;
      }
      
      const pingTime = endTime - startTime;
      console.log(`Supabase ping: ${Math.round(pingTime)}ms`);
      
      // Ripristina il conteggio errori se il ping ha successo
      consecutiveFailures = 0;
      
    } catch (err) {
      console.error("Error during ping:", err);
      handlePingFailure();
    }
  }, 30000);
};

const handlePingFailure = () => {
  consecutiveFailures++;
  
  console.warn(`Ping failure #${consecutiveFailures}`);
  
  // Se ci sono più di 3 errori consecutivi, prova a riconnettere
  if (consecutiveFailures >= 3) {
    toast({
      title: "Problemi di connessione",
      description: "Tentativo di riconnessione in corso...",
      variant: "destructive"
    });
    
    reconnectSupabase();
  }
};

const reconnectSupabase = () => {
  console.log("Attempting to reconnect Supabase Realtime...");
  
  // Annulla timer di riconnessione esistenti
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  // Forza il refresh del token di autenticazione
  supabase.realtime.setAuth(supabase.auth.session()?.access_token || '');
  
  // Verifica la connessione con un canale di test
  const testChannel = supabase.channel('connection-test');
  
  testChannel
    .on('system', { event: 'connected' }, () => {
      console.log('✅ Realtime reconnection successful');
      supabase.removeChannel(testChannel);
      
      // Se la riconnessione ha successo, notifica l'utente
      toast({
        title: "Connessione ripristinata",
        description: "Le funzionalità realtime sono di nuovo attive",
      });
    })
    .subscribe((status) => {
      console.log(`Realtime reconnection test status: ${status}`);
      
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        // Se fallisce, riprova tra 10 secondi
        reconnectTimeout = window.setTimeout(reconnectSupabase, 10000);
      }
    });
};

// Aggiunge funzioni di utilità per il ping alle RPC di Supabase
export const createSupabasePingFunction = async () => {
  try {
    const { error } = await supabase.rpc('create_ping_function');
    if (error) {
      console.error("Could not create ping function:", error);
    } else {
      console.log("Ping function created successfully");
    }
  } catch (err) {
    console.error("Error creating ping function:", err);
  }
};
