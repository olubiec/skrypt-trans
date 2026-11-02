// --- background.js ---

// Inicjalizacja domyślnych ustawień po instalacji wtyczki
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ 
        refreshInterval: 5, // Domyślnie co 5 minut
        isRefreshingActive: false 
    });
});

// Nasłuchiwanie alarmów (budzika)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'transAutoRefresh') {
        console.log("Trans Auto: Budzik dzwoni, uruchamiam odświeżanie!");
        triggerRefreshInTabs();
    }
});

// Funkcja szukająca otwartych kart Trans.eu i wysyłająca sygnał do odświeżenia
async function triggerRefreshInTabs() {
    // Szukamy tylko zakładek z giełdą Trans.eu
    const tabs = await chrome.tabs.query({ url: "https://platform.trans.eu/*" });
    
    for (const tab of tabs) {
        // Wysyłamy polecenie do content.js na tej karcie
        chrome.tabs.sendMessage(tab.id, { action: 'executeRefreshCycle' }).catch(err => {
            // Ignorujemy błąd, jeśli np. karta jeszcze się nie załadowała w pełni
            console.warn("Trans Auto: Nie udało się połączyć z kartą", tab.id);
        });
    }
}

// Nasłuchiwanie komend z panelu użytkownika (popup.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startAutoRefresh') {
        const interval = request.interval || 5;
        
        // Zapisujemy stan do pamięci przeglądarki
        chrome.storage.local.set({ 
            isRefreshingActive: true, 
            refreshInterval: interval 
        });
        
        // Tworzymy budzik
        chrome.alarms.create('transAutoRefresh', { periodInMinutes: interval });
        
        // Uruchamiamy pierwszy cykl natychmiast
        triggerRefreshInTabs(); 
        
        sendResponse({ status: 'Odświeżanie aktywowane' });
    } 
    
    else if (request.action === 'stopAutoRefresh') {
        chrome.storage.local.set({ isRefreshingActive: false });
        chrome.alarms.clear('transAutoRefresh');
        sendResponse({ status: 'Odświeżanie zatrzymane' });
    }
});