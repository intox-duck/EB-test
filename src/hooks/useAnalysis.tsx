import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { BrandAnalysisData } from '@/lib/api/brandAnalysis';
import { useAuth } from '@/hooks/useAuth';

interface SearchHistoryItem {
    id: string;
    companyName: string;
    companyUrl?: string;
    analysedAt: string;
    overallScore: number;
}

interface AnalysisState {
    lastAnalyzedCompany: string | null;
    currentAnalysis: BrandAnalysisData | null;
    detectedCompetitors: string[];
    searchHistory: SearchHistoryItem[];
    setLastAnalyzedCompany: (company: string) => void;
    setLastAnalysis: (data: BrandAnalysisData) => void;
    loadFromHistory: (id: string) => BrandAnalysisData | null;
    saveIntelligenceReport: (companyName: string, data: any) => void;
    getIntelligenceReport: (companyName: string) => any | null;
    clearHistory: () => void;
}

const AnalysisContext = createContext<AnalysisState | undefined>(undefined);

const HISTORY_KEY = 'brandRadar_searchHistory';
const CACHE_KEY = 'brandRadar_analysisCache';
const INTELLIGENCE_KEY = 'brandRadar_intelligenceReports';
const MAX_HISTORY = 20;
const COMPANY_NAME_STOPWORDS = new Set([
    'inc',
    'incorporated',
    'llc',
    'ltd',
    'limited',
    'plc',
    'corp',
    'corporation',
    'company',
    'co',
    'group',
    'holdings',
    'the'
]);

function getStorageKey(userEmail: string | undefined, key: string) {
    return userEmail ? `${key}_${userEmail}` : key;
}

function normalizeCompanyKey(value: string): string {
    return String(value || '').trim().toLowerCase();
}

function tokenizeCompanyName(value: string): string[] {
    return normalizeCompanyKey(value)
        .replace(/[^a-z0-9&]+/g, ' ')
        .split(' ')
        .filter((token) => token && !COMPANY_NAME_STOPWORDS.has(token));
}

function isLikelyCompanyMatch(left: string, right: string): boolean {
    const normalizedLeft = normalizeCompanyKey(left);
    const normalizedRight = normalizeCompanyKey(right);

    if (!normalizedLeft || !normalizedRight) return false;
    if (normalizedLeft === normalizedRight) return true;

    if (
        (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) &&
        Math.min(normalizedLeft.length, normalizedRight.length) >= 4
    ) {
        return true;
    }

    const leftTokens = tokenizeCompanyName(left);
    const rightTokens = tokenizeCompanyName(right);
    if (!leftTokens.length || !rightTokens.length) return false;

    return leftTokens.some((token) => token.length >= 4 && rightTokens.includes(token));
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const userEmail = user?.email;

    // Initialize from localStorage with user-specific keys
    const [lastAnalyzedCompany, setLastAnalyzedCompany] = useState<string | null>(() => {
        const key = getStorageKey(userEmail, 'brandRadar_company');
        return localStorage.getItem(key);
    });

    const [currentAnalysis, setCurrentAnalysis] = useState<BrandAnalysisData | null>(() => {
        const key = getStorageKey(userEmail, 'brandRadar_analysis');
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    });

    const [detectedCompetitors, setDetectedCompetitors] = useState<string[]>(() => {
        const key = getStorageKey(userEmail, 'brandRadar_competitors');
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : [];
    });

    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(() => {
        const key = getStorageKey(userEmail, HISTORY_KEY);
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : [];
    });

    const [intelligenceReports, setIntelligenceReports] = useState<Record<string, any>>(() => {
        const key = getStorageKey(userEmail, INTELLIGENCE_KEY);
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : {};
    });

    const setLastAnalysis = useCallback((data: BrandAnalysisData) => {
        const email = userEmail;

        setLastAnalyzedCompany(data.companyName);
        setCurrentAnalysis(data);
        setDetectedCompetitors(data.competitors || []);

        // Save current analysis to localStorage
        localStorage.setItem(getStorageKey(email, 'brandRadar_company'), data.companyName);
        localStorage.setItem(getStorageKey(email, 'brandRadar_analysis'), JSON.stringify(data));
        localStorage.setItem(getStorageKey(email, 'brandRadar_competitors'), JSON.stringify(data.competitors || []));

        // Add to search history
        const historyItem: SearchHistoryItem = {
            id: `${data.companyName}_${Date.now()}`,
            companyName: data.companyName,
            analysedAt: data.lastUpdated || new Date().toISOString(),
            overallScore: data.overallScore
        };

        setSearchHistory(prev => {
            // Remove duplicates of same company (keep most recent)
            const filtered = prev.filter(h => h.companyName !== data.companyName);
            const updated = [historyItem, ...filtered].slice(0, MAX_HISTORY);
            localStorage.setItem(getStorageKey(email, HISTORY_KEY), JSON.stringify(updated));
            return updated;
        });

        // Cache the full analysis for reload
        const cacheKey = getStorageKey(email, CACHE_KEY);
        const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        cache[historyItem.id] = data;
        // Keep cache size reasonable
        const cacheKeys = Object.keys(cache);
        if (cacheKeys.length > MAX_HISTORY) {
            delete cache[cacheKeys[0]];
        }
        localStorage.setItem(cacheKey, JSON.stringify(cache));
    }, [userEmail]);

    const loadFromHistory = useCallback((id: string): BrandAnalysisData | null => {
        const cacheKey = getStorageKey(userEmail, CACHE_KEY);
        const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        const data = cache[id];
        if (data) {
            setCurrentAnalysis(data);
            setLastAnalyzedCompany(data.companyName);
            setDetectedCompetitors(data.competitors || []);
        }
        return data || null;
    }, [userEmail]);

    const saveIntelligenceReport = useCallback((companyName: string, data: any) => {
        setIntelligenceReports(prev => {
            const updated = { ...prev, [companyName]: { data, savedAt: new Date().toISOString() } };
            localStorage.setItem(getStorageKey(userEmail, INTELLIGENCE_KEY), JSON.stringify(updated));
            return updated;
        });
    }, [userEmail]);

    const getIntelligenceReport = useCallback((companyName: string) => {
        const exact = intelligenceReports[companyName]?.data;
        if (exact) return exact;

        const keys = Object.keys(intelligenceReports);
        const normalizedMatch = keys.find((key) => normalizeCompanyKey(key) === normalizeCompanyKey(companyName));
        if (normalizedMatch) {
            return intelligenceReports[normalizedMatch]?.data || null;
        }

        const aliasMatch = keys.find((key) => isLikelyCompanyMatch(key, companyName));
        return aliasMatch ? intelligenceReports[aliasMatch]?.data || null : null;
    }, [intelligenceReports]);

    const clearHistory = useCallback(() => {
        setSearchHistory([]);
        setIntelligenceReports({});
        localStorage.removeItem(getStorageKey(userEmail, HISTORY_KEY));
        localStorage.removeItem(getStorageKey(userEmail, CACHE_KEY));
        localStorage.removeItem(getStorageKey(userEmail, INTELLIGENCE_KEY));
    }, [userEmail]);

    return (
        <AnalysisContext.Provider value={{
            lastAnalyzedCompany,
            currentAnalysis,
            detectedCompetitors,
            searchHistory,
            setLastAnalyzedCompany: (name: string) => {
                setLastAnalyzedCompany(name);
                localStorage.setItem(getStorageKey(userEmail, 'brandRadar_company'), name);
            },
            setLastAnalysis,
            loadFromHistory,
            saveIntelligenceReport,
            getIntelligenceReport,
            clearHistory
        }}>
            {children}
        </AnalysisContext.Provider>
    );
}

export function useAnalysis() {
    const context = useContext(AnalysisContext);
    if (context === undefined) {
        throw new Error('useAnalysis must be used within an AnalysisProvider');
    }
    return context;
}
