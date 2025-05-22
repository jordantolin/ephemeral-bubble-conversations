
/**
 * Network Monitoring Utility
 * 
 * Questo modulo gestisce il monitoraggio delle connessioni di rete e Supabase Realtime
 * per migliorare l'affidabilità dell'applicazione.
 */

import { toast } from "@/hooks/use-toast";

// Stato della connessione
let isOnline = navigator.onLine;
let monitoringActive = false;
const listeners: Array<(online: boolean) => void> = [];

// Configurazione
const PING_INTERVAL = 30000; // 30 secondi
const CONNECTION_TIMEOUT = 5000; // 5 secondi

/**
 * Inizializza il monitoraggio della rete
 */
export const setupNetworkMonitor = () => {
  if (monitoringActive) return;
  monitoringActive = true;
  
  console.log("Network monitoring initialized");
  
  // Gestione eventi online/offline del browser
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Imposta lo stato iniziale
  isOnline = navigator.onLine;
  
  // Inizia il monitoraggio attivo della connessione
  startActiveMonitoring();
};

/**
 * Termina il monitoraggio della rete
 */
export const teardownNetworkMonitor = () => {
  if (!monitoringActive) return;
  monitoringActive = false;
  
  console.log("Network monitoring terminated");
  
  // Rimuovi gli event listener
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  
  // Interrompi i controlli attivi
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
    pingIntervalId = null;
  }
  
  // Pulisci i listener
  listeners.length = 0;
};

/**
 * Aggiunge un listener per cambiamenti di stato della connessione
 */
export const addNetworkListener = (callback: (online: boolean) => void) => {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};

// Gestori eventi di connessione
function handleOnline() {
  console.log("Browser reports online status");
  updateConnectionStatus(true);
}

function handleOffline() {
  console.log("Browser reports offline status");
  updateConnectionStatus(false);
}

// Aggiorna lo stato della connessione e notifica i listener
function updateConnectionStatus(online: boolean) {
  const statusChanged = online !== isOnline;
  isOnline = online;
  
  if (statusChanged) {
    console.log(`Connection status changed to: ${online ? 'online' : 'offline'}`);
    
    // Notifica cambiamento
    if (online) {
      toast({
        title: "Connessione ristabilita",
        description: "Sei di nuovo online",
        variant: "default"
      });
    } else {
      toast({
        title: "Connessione persa",
        description: "Controlla la tua connessione di rete",
        variant: "destructive"
      });
    }
    
    // Notifica i listener
    listeners.forEach(listener => {
      try {
        listener(online);
      } catch (err) {
        console.error("Error in network status listener:", err);
      }
    });
  }
}

// Monitoraggio attivo della connessione
let pingIntervalId: number | null = null;

function startActiveMonitoring() {
  // Pulisci eventuali interval precedenti
  if (pingIntervalId) {
    clearInterval(pingIntervalId);
  }
  
  // Controlla periodicamente la connessione
  pingIntervalId = window.setInterval(checkConnection, PING_INTERVAL);
  
  // Esegui subito il primo controllo
  checkConnection();
}

// Controlla che la connessione sia attiva facendo un piccolo fetch
async function checkConnection() {
  if (!monitoringActive) return;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT);
    
    // Usa un timestamp per evitare la cache
    const response = await fetch(`/ping?t=${Date.now()}`, { 
      method: 'HEAD',
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    updateConnectionStatus(true);
  } catch (err) {
    // Se la richiesta fallisce o va in timeout, potremmo essere offline
    if (err.name !== 'AbortError') {
      console.warn("Connection check failed:", err);
    }
    
    // Verifica lo stato attuale prima di aggiornare
    // per evitare falsi positivi
    if (navigator.onLine) {
      // Il browser pensa di essere online ma il ping è fallito
      // Potrebbe essere un problema temporaneo o instabilità di rete
      console.log("Connection unstable, browser reports online but ping failed");
    } else {
      updateConnectionStatus(false);
    }
  }
}

// Esponi lo stato attuale della connessione
export const getConnectionStatus = () => {
  return { isOnline };
};
